"""Appointment service."""
from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Sequence

from fastapi import HTTPException, status
from sqlalchemy import and_, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.appointment import Appointment
from app.models.service import Service
from app.models.staff import Staff
from app.schemas.appointment import AppointmentCreate, AppointmentUpdate

_APPT_STATUSES = {"scheduled", "confirmed", "in_progress", "completed", "cancelled", "no_show"}


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
        if search:
            q = f"%{search.strip()}%"
            f = or_(
                Appointment.guest_name.ilike(q),
                Appointment.guest_email.ilike(q),
                Appointment.guest_phone.ilike(q),
                Appointment.notes.ilike(q),
                Appointment.status.ilike(q),
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

        await self._validate_refs(tenant_id, data.service_id, data.staff_id)
        if data.end_time <= data.start_time:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="end_time must be after start_time")
        await self._ensure_no_conflict(tenant_id, data.staff_id, data.start_time, data.end_time)

        payload = data.model_dump()
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
        new_status = payload.get("status")
        if new_status is not None and new_status not in _APPT_STATUSES:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid appointment status")

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

    async def _ensure_no_conflict(self, tenant_id: uuid.UUID, staff_id: str, start_time: datetime, end_time: datetime, exclude_id: uuid.UUID | None = None) -> None:
        stmt = select(Appointment.id).where(
            Appointment.tenant_id == tenant_id,
            Appointment.staff_id == staff_id,
            Appointment.status.in_(["scheduled", "confirmed", "in_progress"]),
            Appointment.start_time < end_time,
            Appointment.end_time > start_time,
        )
        if exclude_id is not None:
            stmt = stmt.where(Appointment.id != exclude_id)
        exists = (await self.session.execute(stmt)).scalar_one_or_none()
        if exists is not None:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Staff member has a conflicting appointment for this time slot")

    async def _validate_refs(self, tenant_id: uuid.UUID, service_id: str, staff_id: str) -> None:
        try:
            svc_uuid = uuid.UUID(str(service_id))
            staff_uuid = uuid.UUID(str(staff_id))
        except (ValueError, TypeError):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid service_id or staff_id")
        svc = (await self.session.execute(select(Service.id).where(Service.id == svc_uuid, Service.tenant_id == tenant_id))).scalar_one_or_none()
        if svc is None:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Service not found for tenant")
        st = (await self.session.execute(select(Staff.id).where(Staff.id == staff_uuid, Staff.tenant_id == tenant_id))).scalar_one_or_none()
        if st is None:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Staff not found for tenant")

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
        if appt.payment_status == "completed":
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Payment has already been collected for this appointment")

        amt = Decimal(str(amount))
        if amt <= 0:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Amount must be greater than zero")

        svc = None
        try:
            svc_uuid = uuid.UUID(str(appt.service_id))
            svc = (await self.session.execute(select(Service).where(Service.id == svc_uuid, Service.tenant_id == tenant_id))).scalar_one_or_none()
        except Exception:
            svc = None

        customer_uuid = None
        if appt.customer_id:
            try:
                customer_uuid = uuid.UUID(str(appt.customer_id))
            except Exception:
                customer_uuid = None

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
            line_items = [{"service_id": str(appt.service_id), "service_name": (svc.name if svc else "Service"), "quantity": 1, "unit_price": str(unit_price), "total": str(amt)}]
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
