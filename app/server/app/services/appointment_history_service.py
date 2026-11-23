"""Appointment history service."""
from __future__ import annotations

import uuid
from decimal import Decimal

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.appointment import Appointment
from app.models.appointment_history import AppointmentHistory


class AppointmentHistoryService:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_by_appointment(self, tenant_id: uuid.UUID, appointment_id: uuid.UUID) -> AppointmentHistory | None:
        res = await self.session.execute(
            select(AppointmentHistory).where(
                AppointmentHistory.tenant_id == tenant_id,
                AppointmentHistory.appointment_id == appointment_id,
            )
        )
        return res.scalar_one_or_none()

    async def create_from_appointment(self, tenant_id: uuid.UUID, appointment_id: uuid.UUID) -> AppointmentHistory | None:
        appt = (
            await self.session.execute(
                select(Appointment).where(Appointment.id == appointment_id, Appointment.tenant_id == tenant_id)
            )
        ).scalar_one_or_none()
        if appt is None or appt.status not in {"confirmed", "completed", "cancelled", "no_show"}:
            return None
        existing = await self.get_by_appointment(tenant_id, appointment_id)
        if existing:
            # keep history in sync with latest appointment snapshot
            existing.customer_id = uuid.UUID(str(appt.customer_id)) if appt.customer_id else existing.customer_id
            existing.service_id = uuid.UUID(str(appt.service_id))
            existing.staff_id = uuid.UUID(str(appt.staff_id))
            existing.appointment_date = appt.start_time
            existing.duration_minutes = max(1, int((appt.end_time - appt.start_time).total_seconds() / 60))
            existing.amount_paid = Decimal(str(appt.price or 0))
            existing.notes = appt.notes
            await self.session.flush()
            await self.session.refresh(existing)
            return existing
        if not appt.customer_id:
            return None
        try:
            customer_uuid = uuid.UUID(str(appt.customer_id))
            service_uuid = uuid.UUID(str(appt.service_id))
            staff_uuid = uuid.UUID(str(appt.staff_id))
        except Exception:
            return None
        history = AppointmentHistory(
            tenant_id=tenant_id,
            customer_id=customer_uuid,
            appointment_id=appointment_id,
            service_id=service_uuid,
            staff_id=staff_uuid,
            appointment_date=appt.start_time,
            duration_minutes=max(1, int((appt.end_time - appt.start_time).total_seconds() / 60)),
            amount_paid=Decimal(str(appt.price or 0)),
            notes=appt.notes,
        )
        self.session.add(history)
        await self.session.flush()
        await self.session.refresh(history)
        return history

    async def list_for_customer(
        self, tenant_id: uuid.UUID, customer_id: uuid.UUID, *, page: int = 1, page_size: int = 20
    ) -> tuple[list[AppointmentHistory], int]:
        base = select(AppointmentHistory).where(
            AppointmentHistory.tenant_id == tenant_id,
            AppointmentHistory.customer_id == customer_id,
        )
        total = (await self.session.execute(select(func.count()).select_from(base.subquery()))).scalar_one()
        stmt = base.order_by(AppointmentHistory.appointment_date.desc()).offset((page - 1) * page_size).limit(page_size)
        return list((await self.session.execute(stmt)).scalars().all()), total
