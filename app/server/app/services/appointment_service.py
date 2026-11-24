"""Appointment service."""
from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError
from typing import Sequence

from fastapi import HTTPException, status
from sqlalchemy import String, cast, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.appointment import Appointment
from app.models.customer import Customer
from app.models.service import Service
from app.models.staff import Staff
from app.models.user import User
from app.schemas.appointment import AppointmentCreate, AppointmentUpdate
from app.services.availability_service import AvailabilityService

_APPT_STATUSES = {"scheduled", "confirmed", "in_progress", "completed", "cancelled", "no_show"}
_ALLOWED_STATUS_TRANSITIONS = {
    "scheduled": {"confirmed", "cancelled", "no_show"},
    "confirmed": {"in_progress", "cancelled", "no_show"},
    "in_progress": {"completed", "cancelled"},
    "completed": set(),
    "cancelled": set(),
    "no_show": set(),
}


class AppointmentService:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def list_appointments(
        self,
        tenant_id: uuid.UUID,
        *,
        status: str | None = None,
        staff_id: str | None = None,
        customer_id: str | None = None,
        service_id: str | None = None,
        start_date: datetime | None = None,
        end_date: datetime | None = None,
        search: str | None = None,
        page: int = 1,
        page_size: int = 50,
    ) -> tuple[Sequence[Appointment], int]:
        stmt = select(Appointment).where(Appointment.tenant_id == tenant_id)
        count_stmt = select(func.count()).select_from(Appointment).where(Appointment.tenant_id == tenant_id)

        if status:
            stmt = stmt.where(Appointment.status == status)
            count_stmt = count_stmt.where(Appointment.status == status)
        if staff_id:
            stmt = stmt.where(Appointment.staff_id == staff_id)
            count_stmt = count_stmt.where(Appointment.staff_id == staff_id)
        if customer_id:
            stmt = stmt.where(Appointment.customer_id == customer_id)
            count_stmt = count_stmt.where(Appointment.customer_id == customer_id)
        if service_id:
            stmt = stmt.where(Appointment.service_id == service_id)
            count_stmt = count_stmt.where(Appointment.service_id == service_id)
        if start_date:
            stmt = stmt.where(Appointment.start_time >= start_date)
            count_stmt = count_stmt.where(Appointment.start_time >= start_date)
        if end_date:
            stmt = stmt.where(Appointment.start_time <= end_date)
            count_stmt = count_stmt.where(Appointment.start_time <= end_date)
        if search and search.strip():
            q = f"%{search.strip()}%"
            service_match = select(1).where(
                Service.tenant_id == tenant_id,
                cast(Service.id, String) == Appointment.service_id,
                Service.name.ilike(q),
            ).exists()
            customer_match = select(1).where(
                Customer.tenant_id == tenant_id,
                cast(Customer.id, String) == Appointment.customer_id,
                or_(
                    Customer.first_name.ilike(q),
                    Customer.last_name.ilike(q),
                    Customer.email.ilike(q),
                    func.concat(Customer.first_name, " ", Customer.last_name).ilike(q),
                ),
            ).exists()
            staff_match = select(1).select_from(Staff).join(
                User, cast(User.id, String) == Staff.user_id
            ).where(
                Staff.tenant_id == tenant_id,
                User.tenant_id == tenant_id,
                cast(Staff.id, String) == Appointment.staff_id,
                or_(User.first_name.ilike(q), User.last_name.ilike(q), User.email.ilike(q)),
            ).exists()
            f = or_(
                cast(Appointment.id, String).ilike(q),
                Appointment.staff_id.ilike(q),
                Appointment.service_id.ilike(q),
                Appointment.customer_id.ilike(q),
                Appointment.guest_name.ilike(q),
                Appointment.guest_email.ilike(q),
                Appointment.guest_phone.ilike(q),
                Appointment.notes.ilike(q),
                Appointment.status.ilike(q),
                service_match,
                customer_match,
                staff_match,
            )
            stmt = stmt.where(f)
            count_stmt = count_stmt.where(f)

        total = (await self.session.execute(count_stmt)).scalar_one()
        stmt = stmt.order_by(Appointment.start_time.desc()).offset((page - 1) * page_size).limit(page_size)
        result = await self.session.execute(stmt)
        return result.scalars().all(), total

    async def create(self, tenant_id: uuid.UUID, data: AppointmentCreate) -> Appointment:
        if data.idempotency_key:
            existing = await self.session.execute(
                select(Appointment).where(
                    Appointment.idempotency_key == data.idempotency_key,
                    Appointment.tenant_id == tenant_id,
                )
            )
            found = existing.scalar_one_or_none()
            if found is not None:
                return found

        service, _ = await self._validate_refs(tenant_id, data.service_id, data.staff_id)
        await self._validate_customer(tenant_id, data.customer_id, data.is_guest)
        await self._validate_slot(
            tenant_id, data.staff_id, service, data.start_time, data.end_time, time_zone=data.time_zone
        )

        payload = data.model_dump()
        payload.pop("time_zone", None)
        payload.setdefault("status", "scheduled")
        if payload.get("status") not in _APPT_STATUSES:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid appointment status")
        appt = Appointment(tenant_id=tenant_id, **payload)
        self.session.add(appt)
        await self.session.flush()
        await self.session.refresh(appt)
        return appt

    async def get(self, tenant_id: uuid.UUID, appointment_id: uuid.UUID) -> Appointment | None:
        result = await self.session.execute(
            select(Appointment).where(Appointment.id == appointment_id, Appointment.tenant_id == tenant_id)
        )
        return result.scalar_one_or_none()

    async def update(self, tenant_id: uuid.UUID, appointment_id: uuid.UUID, data: AppointmentUpdate) -> Appointment | None:
        appt = await self.get(tenant_id, appointment_id)
        if appt is None:
            return None
        payload = data.model_dump(exclude_unset=True)
        time_zone = payload.pop("time_zone", None) or "UTC"
        new_status = payload.get("status")
        if new_status is not None and new_status not in _APPT_STATUSES:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid appointment status")
        if new_status is not None and new_status != appt.status and new_status not in _ALLOWED_STATUS_TRANSITIONS.get(appt.status, set()):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Cannot change appointment status from {appt.status} to {new_status}",
            )

        if any(key in payload for key in ("staff_id", "service_id", "start_time", "end_time")):
            if appt.status not in {"scheduled", "confirmed"}:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=f"Cannot reschedule an appointment with status {appt.status}",
                )
            staff_id = payload.get("staff_id", appt.staff_id)
            service_id = payload.get("service_id", appt.service_id)
            start_time = payload.get("start_time", appt.start_time)
            end_time = payload.get("end_time", appt.end_time)
            service, _ = await self._validate_refs(tenant_id, service_id, staff_id)
            await self._validate_slot(
                tenant_id, staff_id, service, start_time, end_time,
                exclude_id=appt.id, time_zone=time_zone,
            )
            payload.update(
                staff_id=staff_id,
                service_id=service_id,
                start_time=start_time,
                end_time=end_time,
            )

        now = datetime.now(timezone.utc)
        if new_status == "confirmed" and appt.confirmed_at is None:
            appt.confirmed_at = now
        if new_status == "cancelled":
            appt.cancelled_at = payload.get("cancelled_at") or now
            appt.cancelled_by = payload.get("cancelled_by") or appt.cancelled_by
        if new_status == "no_show" and not payload.get("no_show_reason") and not appt.no_show_reason:
            appt.no_show_reason = "Marked as no-show"
        for field, value in payload.items():
            if field in {"cancelled_at", "cancelled_by"}:
                continue
            setattr(appt, field, value)
        if "cancelled_at" in payload and payload["cancelled_at"] is not None:
            appt.cancelled_at = payload["cancelled_at"]
        if "cancelled_by" in payload and payload["cancelled_by"] is not None:
            appt.cancelled_by = payload["cancelled_by"]
        await self.session.flush()
        await self.session.refresh(appt)
        return appt

    async def delete(self, tenant_id: uuid.UUID, appointment_id: uuid.UUID) -> bool:
        appt = await self.get(tenant_id, appointment_id)
        if appt is None:
            return False
        await self.session.delete(appt)
        await self.session.flush()
        return True

    async def _validate_refs(self, tenant_id: uuid.UUID, service_id: str, staff_id: str) -> tuple[Service, Staff]:
        try:
            svc_uuid = uuid.UUID(str(service_id))
            staff_uuid = uuid.UUID(str(staff_id))
        except (ValueError, TypeError):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid service_id or staff_id")
        svc = (await self.session.execute(
            select(Service).where(
                Service.id == svc_uuid,
                Service.tenant_id == tenant_id,
                Service.is_active.is_(True),
            )
        )).scalar_one_or_none()
        if svc is None:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Active service not found for tenant")
        if svc.duration_minutes <= 0:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Service duration must be greater than zero")
        st = (await self.session.execute(
            select(Staff).where(
                Staff.id == staff_uuid,
                Staff.tenant_id == tenant_id,
                Staff.status == "active",
            ).with_for_update()
        )).scalar_one_or_none()
        if st is None:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Active staff member not found for tenant")
        if svc.staff_ids and staff_uuid not in svc.staff_ids:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Staff member is not assigned to this service")
        return svc, st

    async def _validate_customer(self, tenant_id: uuid.UUID, customer_id: str | None, is_guest: bool) -> None:
        if customer_id is None and is_guest:
            return
        if customer_id is None:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="A valid customer_id is required")
        try:
            customer_uuid = uuid.UUID(str(customer_id))
        except (ValueError, TypeError):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="A valid customer_id is required")
        exists = (await self.session.execute(
            select(Customer.id).where(
                Customer.id == customer_uuid,
                Customer.tenant_id == tenant_id,
                Customer.status == "active",
            )
        )).scalar_one_or_none()
        if exists is None:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Active customer not found for tenant")

    async def _validate_slot(
        self,
        tenant_id: uuid.UUID,
        staff_id: str,
        service: Service,
        start_time: datetime,
        end_time: datetime,
        exclude_id: uuid.UUID | None = None,
        time_zone: str = "UTC",
    ) -> None:
        if start_time.tzinfo is None or end_time.tzinfo is None:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Booking times must include a timezone")
        try:
            zone = ZoneInfo(time_zone)
        except ZoneInfoNotFoundError as exc:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid time_zone") from exc
        start_local = start_time.astimezone(zone)
        end_utc = end_time.astimezone(timezone.utc)
        start_utc = start_time.astimezone(timezone.utc)
        expected_end = start_utc + timedelta(minutes=service.duration_minutes)
        if end_utc != expected_end:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Booking duration must match the selected service")
        try:
            staff_uuid = uuid.UUID(str(staff_id))
            service_uuid = uuid.UUID(str(service.id))
        except (ValueError, TypeError) as exc:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid service_id or staff_id") from exc

        slots = await AvailabilityService(self.session).get_available_slots(
            tenant_id, staff_uuid, service_uuid, start_local.date(),
            exclude_id=exclude_id, time_zone=time_zone,
        )
        requested_time = start_local.strftime("%H:%M")
        matching = next((slot for slot in slots if slot["start_time"] == requested_time), None)
        if matching is None:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Requested time is outside staff availability")
        if not matching["isAvailable"]:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Requested staff time slot is already booked")
    async def collect_payment(self, tenant_id: uuid.UUID, appointment_id: uuid.UUID, payment_method: str, amount, notes: str | None = None):
        from decimal import Decimal
        from app.models.invoice import Invoice
        from app.models.payment import Payment
        from app.models.customer import Customer

        appt = await self.get(tenant_id, appointment_id)
        if appt is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Appointment not found")
        if appt.payment_option != "later":
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="This appointment is not a pay-later booking")
        if appt.status != "completed":
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Payment can only be collected for completed appointments")
        if appt.payment_status == "completed":
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Payment has already been collected for this appointment")

        amt = Decimal(str(amount))
        if amt <= 0:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Amount must be greater than zero")

        try:
            svc_uuid = uuid.UUID(str(appt.service_id))
        except (ValueError, TypeError) as exc:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid appointment service_id") from exc
        svc = (await self.session.execute(
            select(Service).where(Service.id == svc_uuid, Service.tenant_id == tenant_id)
        )).scalar_one_or_none()
        if svc is None:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Appointment service not found")

        due = Decimal(str(appt.price if appt.price is not None else svc.price))
        if amt != due:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Payment amount must equal the outstanding balance of {due}",
            )

        customer_uuid = None
        if appt.customer_id:
            try:
                customer_uuid = uuid.UUID(str(appt.customer_id))
            except (ValueError, TypeError) as exc:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid appointment customer_id") from exc
            customer_exists = (await self.session.execute(
                select(Customer.id).where(Customer.id == customer_uuid, Customer.tenant_id == tenant_id)
            )).scalar_one_or_none()
            if customer_exists is None:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Appointment customer not found for tenant")

        ref = f"APT-{str(appt.id)[:8].upper()}-{uuid.uuid4().hex[:8].upper()}"
        payment = Payment(
            tenant_id=tenant_id,
            customer_id=customer_uuid,
            amount=amt,
            status="success",
            reference=ref,
            gateway="manual",
            payment_method=payment_method,
            metadata_={"appointment_id": str(appt.id), "notes": notes or "", "source": "collect-payment"},
        )
        self.session.add(payment)
        await self.session.flush()

        invoice = (await self.session.execute(select(Invoice).where(Invoice.tenant_id == tenant_id, Invoice.appointment_id == appt.id))).scalar_one_or_none()
        if invoice is None and customer_uuid is not None:
            unit_price = Decimal(str(appt.price if appt.price is not None else (svc.price if svc and svc.price is not None else amt)))
            line_items = [{"service_id": str(appt.service_id), "service_name": svc.name, "quantity": 1, "unit_price": str(unit_price), "total": str(amt)}]
            invoice = Invoice(tenant_id=tenant_id, appointment_id=appt.id, customer_id=customer_uuid, line_items=line_items, subtotal=amt, discount=Decimal("0"), tax=Decimal("0"), total=amt, status="paid", paid_at=datetime.now(timezone.utc), notes=notes)
            self.session.add(invoice)
            await self.session.flush()
        elif invoice is not None:
            invoice.status = "paid"
            invoice.paid_at = invoice.paid_at or datetime.now(timezone.utc)
            if notes:
                invoice.notes = notes
            await self.session.flush()

        if invoice is not None:
            payment.invoice_id = invoice.id

        appt.payment_status = "completed"
        appt.payment_id = str(payment.id)
        await self.session.flush()

        if customer_uuid is not None:
            cust = (await self.session.execute(select(Customer).where(Customer.id == customer_uuid, Customer.tenant_id == tenant_id))).scalar_one_or_none()
            if cust:
                from sqlalchemy import func
                from app.models.invoice import Invoice as Inv
                outstanding_stmt = select(func.coalesce(func.sum(Inv.total), 0)).where(Inv.tenant_id == tenant_id, Inv.customer_id == customer_uuid, Inv.status.in_(["issued", "overdue"]))
                cust.outstanding_balance = (await self.session.execute(outstanding_stmt)).scalar_one()

        await self.session.flush()
        await self.session.refresh(appt)
        return appt
