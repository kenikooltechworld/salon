"""Appointment service."""
from __future__ import annotations

import uuid
from datetime import datetime, timezone
from decimal import Decimal
from typing import Sequence

from fastapi import HTTPException, status
from sqlalchemy import select
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

    async def update(
        self, tenant_id: uuid.UUID, appointment_id: uuid.UUID, data: AppointmentUpdate
    ) -> Appointment | None:
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

    async def _validate_refs(self, tenant_id: uuid.UUID, service_id: str, staff_id: str) -> None:
        try:
            svc_uuid = uuid.UUID(str(service_id))
            staff_uuid = uuid.UUID(str(staff_id))
        except (ValueError, TypeError):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid service_id or staff_id")
        svc = (
            await self.session.execute(select(Service.id).where(Service.id == svc_uuid, Service.tenant_id == tenant_id))
        ).scalar_one_or_none()
        if svc is None:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Service not found for tenant")
        st = (
            await self.session.execute(select(Staff.id).where(Staff.id == staff_uuid, Staff.tenant_id == tenant_id))
        ).scalar_one_or_none()
        if st is None:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Staff not found for tenant")
