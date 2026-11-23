"""Appointment controller."""
from __future__ import annotations

import uuid
from datetime import datetime, timezone

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.schemas.appointment import AppointmentCreate, AppointmentRead, AppointmentUpdate
from app.schemas.notification import NotificationCreate
from app.services.appointment_history_service import AppointmentHistoryService
from app.services.appointment_service import AppointmentService
from app.services.notification_service import NotificationService
from app.services.service_commission_service import ServiceCommissionService


class AppointmentController:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.service = AppointmentService(session)
        self.notifications = NotificationService(session)
        self.commissions = ServiceCommissionService(session)
        self.history = AppointmentHistoryService(session)

    async def list(
        self, tenant_id: uuid.UUID, status: str | None = None, staff_id: str | None = None
    ) -> list[AppointmentRead]:
        items = await self.service.list_appointments(tenant_id, status=status, staff_id=staff_id)
        return [AppointmentRead.model_validate(i) for i in items]

    async def create(self, tenant_id: uuid.UUID, actor_id: uuid.UUID, data: AppointmentCreate) -> AppointmentRead:
        item = await self.service.create(tenant_id, data)
        await self.session.flush()
        await self.history.create_from_appointment(tenant_id, item.id)
        await self.notifications.create(
            tenant_id,
            NotificationCreate(
                recipient_id=actor_id,
                notification_type="appointment.created",
                title="Appointment created",
                content=f"Appointment for {item.start_time.isoformat()} was created.",
                data={"appointment_id": str(item.id), "status": item.status},
            ),
        )
        return AppointmentRead.model_validate(item)

    async def get(self, tenant_id: uuid.UUID, appointment_id: uuid.UUID) -> AppointmentRead:
        item = await self.service.get(tenant_id, appointment_id)
        if item is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Appointment not found")
        return AppointmentRead.model_validate(item)

    async def update(
        self, tenant_id: uuid.UUID, actor_id: uuid.UUID, appointment_id: uuid.UUID, data: AppointmentUpdate
    ) -> AppointmentRead:
        before = await self.service.get(tenant_id, appointment_id)
        if before is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Appointment not found")
        prev_status = before.status
        item = await self.service.update(tenant_id, appointment_id, data)
        if item is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Appointment not found")

        if item.status == "completed" and prev_status != "completed":
            await self.commissions.calculate_for_appointment(tenant_id, item.id)
        if item.status in {"confirmed", "completed", "cancelled", "no_show"}:
            await self.history.create_from_appointment(tenant_id, item.id)
        await self.session.flush()
        await self.notifications.create(
            tenant_id,
            NotificationCreate(
                recipient_id=actor_id,
                notification_type="appointment.updated",
                title="Appointment updated",
                content=f"Appointment status is {item.status}.",
                data={"appointment_id": str(item.id), "status": item.status, "previous_status": prev_status},
            ),
        )
        return AppointmentRead.model_validate(item)

    async def delete(self, tenant_id: uuid.UUID, actor_id: uuid.UUID, appointment_id: uuid.UUID) -> None:
        item = await self.service.get(tenant_id, appointment_id)
        if item is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Appointment not found")
        ok = await self.service.delete(tenant_id, appointment_id)
        if not ok:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Appointment not found")
        await self.session.flush()
        await self.notifications.create(
            tenant_id,
            NotificationCreate(
                recipient_id=actor_id,
                notification_type="appointment.deleted",
                title="Appointment deleted",
                content="An appointment was deleted.",
                data={"appointment_id": str(appointment_id)},
            ),
        )
