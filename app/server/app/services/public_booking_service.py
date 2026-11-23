"""Public booking service for tenant subdomain booking flow."""
from __future__ import annotations

import hashlib
import uuid
from datetime import date, datetime, time, timedelta, timezone

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.appointment import Appointment
from app.models.customer import Customer
from app.models.service import Service
from app.models.staff import Staff
from app.models.tenant import Tenant
from app.models.user import User
from app.schemas.public_booking import PublicBookingCreate
from app.services.availability_service import AvailabilityService


class PublicBookingService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.availability = AvailabilityService(session)

    async def resolve_tenant(self, tenant: Tenant) -> Tenant:
        if not tenant.is_published or tenant.status != "active":
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Salon not found")
        return tenant

    async def get_salon_info(self, tenant: Tenant) -> Tenant:
        return await self.resolve_tenant(tenant)

    async def list_services(self, tenant_id: uuid.UUID) -> list[Service]:
        result = await self.session.execute(
            select(Service).where(Service.tenant_id == tenant_id, Service.is_published.is_(True), Service.is_active.is_(True)).order_by(Service.name.asc())
        )
        return list(result.scalars().all())

    async def list_staff(self, tenant_id: uuid.UUID, service_id: uuid.UUID | None = None) -> list[dict]:
        stmt = select(Staff).where(Staff.tenant_id == tenant_id, Staff.status == "active", Staff.is_available_for_public_booking.is_(True))
        result = await self.session.execute(stmt)
        rows = []
        for staff in result.scalars().all():
            if service_id and str(service_id) not in {str(x) for x in (staff.service_ids or [])}:
                continue
            first_name, last_name = "Staff", ""
            try:
                user_id = uuid.UUID(str(staff.user_id))
            except Exception:
                user_id = None
            if user_id:
                user = (await self.session.execute(select(User).where(User.id == user_id, User.tenant_id == tenant_id))).scalar_one_or_none()
                if user:
                    first_name, last_name = user.first_name, user.last_name
            rows.append({
                "id": staff.id,
                "first_name": first_name,
                "last_name": last_name,
                "is_available_for_public_booking": staff.is_available_for_public_booking,
                "bio": staff.bio,
                "profile_image_url": staff.profile_image_url,
                "specialties": staff.specialties or [],
                "rating": float(staff.rating) if staff.rating is not None else None,
                "review_count": staff.review_count or 0,
            })
        return rows

    async def get_availability(self, tenant_id: uuid.UUID, service_id: uuid.UUID, staff_id: uuid.UUID, booking_date: date) -> list[dict]:
        await self._validate_service_staff(tenant_id, service_id, staff_id)
        return await self.availability.get_available_slots(tenant_id, staff_id, service_id, booking_date)

    async def create_booking(self, tenant_id: uuid.UUID, data: PublicBookingCreate, *, ip_address: str | None, user_agent: str | None, idempotency_key: str | None) -> Appointment:
        service, staff = await self._validate_service_staff(tenant_id, data.service_id, data.staff_id)
        if not service.allow_public_booking:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="This service does not allow public bookings")

        booking_time = datetime.strptime(data.booking_time, "%H:%M").time()
        booking_dt = datetime.combine(data.booking_date, booking_time, tzinfo=timezone.utc)
        duration = int(data.duration_minutes or service.duration_minutes)
        if duration != int(service.duration_minutes):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Duration must be {service.duration_minutes} minutes")
        end_dt = booking_dt + timedelta(minutes=duration)
        if booking_dt <= datetime.now(timezone.utc):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot book appointments in the past")

        slots = await self.availability.get_available_slots(tenant_id, data.staff_id, data.service_id, data.booking_date)
        if not any(s["time"] == data.booking_time and s["available"] for s in slots):
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Selected time slot is not available")

        key = idempotency_key or hashlib.sha256(f"{tenant_id}:{data.customer_email}:{data.booking_date}:{data.booking_time}:{data.service_id}:{data.staff_id}".encode()).hexdigest()
        existing = (await self.session.execute(select(Appointment).where(Appointment.tenant_id == tenant_id, Appointment.idempotency_key == key))).scalar_one_or_none()
        if existing:
            return existing

        customer = await self._get_or_create_guest_customer(tenant_id, data.customer_name, str(data.customer_email), data.customer_phone)

        appt = Appointment(
            tenant_id=tenant_id,
            customer_id=str(customer.id),
            staff_id=str(data.staff_id),
            service_id=str(data.service_id),
            start_time=booking_dt,
            end_time=end_dt,
            status="scheduled",
            notes=data.notes,
            price=service.price,
            is_guest=True,
            guest_name=data.customer_name,
            guest_email=str(data.customer_email),
            guest_phone=data.customer_phone,
            idempotency_key=key,
            payment_option=data.payment_option or "later",
            payment_status="pending" if (data.payment_option or "later") == "now" else None,
            ip_address=ip_address,
            user_agent=user_agent[:500] if user_agent else None,
        )
        self.session.add(appt)
        await self.session.commit()
        await self.session.refresh(appt)
        return appt

    async def get_booking(self, tenant_id: uuid.UUID, booking_id: uuid.UUID) -> Appointment:
        appt = (await self.session.execute(select(Appointment).where(Appointment.id == booking_id, Appointment.tenant_id == tenant_id, Appointment.is_guest.is_(True)))).scalar_one_or_none()
        if appt is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Booking not found")
        return appt

    async def get_statistics(self, tenant_id: uuid.UUID) -> dict:
        total = (await self.session.execute(select(func.count()).select_from(Appointment).where(Appointment.tenant_id == tenant_id))).scalar_one() or 0
        # No review table in rebuild yet; return safe defaults matching legacy shape.
        return {"total_bookings": max(int(total), 0), "average_rating": 0.0, "average_response_time": 120}

    async def get_testimonials(self, tenant_id: uuid.UUID, limit: int) -> list[dict]:
        # No testimonial model in rebuild; return empty list (no fake data).
        return []

    async def submit_review(self, tenant_id: uuid.UUID, booking_id: uuid.UUID, rating: int, feedback: str | None) -> dict:
        appt = await self.get_booking(tenant_id, booking_id)
        if appt.status != "completed":
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot review a booking that has not been completed")
        # Store review in notes metadata until dedicated review model exists? No - avoid corrupting notes.
        # Return explicit unsupported-until-model behavior is bad; instead persist as appointment no-op not acceptable.
        raise HTTPException(status_code=status.HTTP_501_NOT_IMPLEMENTED, detail="Review storage not implemented")

    async def _validate_service_staff(self, tenant_id: uuid.UUID, service_id: uuid.UUID, staff_id: uuid.UUID) -> tuple[Service, Staff]:
        service = (await self.session.execute(select(Service).where(Service.id == service_id, Service.tenant_id == tenant_id, Service.is_published.is_(True), Service.is_active.is_(True)))).scalar_one_or_none()
        if service is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Service not found")
        staff = (await self.session.execute(select(Staff).where(Staff.id == staff_id, Staff.tenant_id == tenant_id, Staff.status == "active"))).scalar_one_or_none()
        if staff is None or not staff.is_available_for_public_booking:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Staff member not found")
        if str(service_id) not in {str(x) for x in (staff.service_ids or [])}:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="This staff member does not provide this service")
        return service, staff

    async def _get_or_create_guest_customer(self, tenant_id: uuid.UUID, name: str, email: str, phone: str) -> Customer:
        result = await self.session.execute(select(Customer).where(Customer.tenant_id == tenant_id, Customer.email == email))
        existing = result.scalar_one_or_none()
        if existing:
            return existing
        parts = (name or "").strip().split(None, 1)
        first = parts[0] if parts else "Guest"
        last = parts[1] if len(parts) > 1 else "Customer"
        cust = Customer(tenant_id=tenant_id, first_name=first[:100], last_name=last[:100], email=email, phone=phone[:32], status="active")
        self.session.add(cust)
        await self.session.flush()
        return cust
