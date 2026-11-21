"""Appointment service."""
from __future__ import annotations

import uuid
from typing import Sequence

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.appointment import Appointment
from app.schemas.appointment import AppointmentCreate, AppointmentUpdate


class AppointmentService:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def list_appointments(
        self, tenant_id: uuid.UUID, *, status: str | None = None, staff_id: str | None = None
    ) -> Sequence[Appointment]:
        stmt = select(Appointment).where(Appointment.tenant_id == tenant_id)
        if status:
            stmt = stmt.where(Appointment.status == status)
        if staff_id:
            stmt = stmt.where(Appointment.staff_id == staff_id)
        stmt = stmt.order_by(Appointment.start_time.desc())
        result = await self.session.execute(stmt)
        return result.scalars().all()

    async def create(self, tenant_id: uuid.UUID, data: AppointmentCreate) -> Appointment:
        if data.idempotency_key:
            existing = await self.session.execute(
                select(Appointment).where(Appointment.idempotency_key == data.idempotency_key)
            )
            found = existing.scalar_one_or_none()
            if found is not None:
                return found

        appt = Appointment(tenant_id=tenant_id, **data.model_dump())
        self.session.add(appt)
        await self.session.flush()
        await self.session.refresh(appt)
        return appt

    async def get(self, tenant_id: uuid.UUID, appointment_id: uuid.UUID) -> Appointment | None:
        result = await self.session.execute(
            select(Appointment).where(Appointment.id == appointment_id, Appointment.tenant_id == tenant_id)
        )
        return result.scalar_one_or_none()

    async def update(
        self, tenant_id: uuid.UUID, appointment_id: uuid.UUID, data: AppointmentUpdate
    ) -> Appointment | None:
        appt = await self.get(tenant_id, appointment_id)
        if appt is None:
            return None
        for field, value in data.model_dump(exclude_unset=True).items():
            setattr(appt, field, value)
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
