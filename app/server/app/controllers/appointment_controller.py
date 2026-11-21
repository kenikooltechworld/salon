"""Appointment controller."""
from __future__ import annotations

import uuid

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.schemas.appointment import AppointmentCreate, AppointmentRead, AppointmentUpdate
from app.services.appointment_service import AppointmentService


class AppointmentController:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.service = AppointmentService(session)

    async def list(
        self, tenant_id: uuid.UUID, status: str | None = None, staff_id: str | None = None
    ) -> list[AppointmentRead]:
        items = await self.service.list_appointments(tenant_id, status=status, staff_id=staff_id)
        return [AppointmentRead.model_validate(i) for i in items]

    async def create(self, tenant_id: uuid.UUID, data: AppointmentCreate) -> AppointmentRead:
        item = await self.service.create(tenant_id, data)
        await self.session.commit()
        return AppointmentRead.model_validate(item)

    async def get(self, tenant_id: uuid.UUID, appointment_id: uuid.UUID) -> AppointmentRead:
        item = await self.service.get(tenant_id, appointment_id)
        if item is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Appointment not found")
        return AppointmentRead.model_validate(item)

    async def update(
        self, tenant_id: uuid.UUID, appointment_id: uuid.UUID, data: AppointmentUpdate
    ) -> AppointmentRead:
        item = await self.service.update(tenant_id, appointment_id, data)
        if item is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Appointment not found")
        await self.session.commit()
        return AppointmentRead.model_validate(item)

    async def delete(self, tenant_id: uuid.UUID, appointment_id: uuid.UUID) -> None:
        ok = await self.service.delete(tenant_id, appointment_id)
        if not ok:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Appointment not found")
        await self.session.commit()
