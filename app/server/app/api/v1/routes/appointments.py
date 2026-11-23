"""Appointment routes."""
from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.controllers.appointment_controller import AppointmentController
from app.lib.deps import db_session, get_current_user, require_roles
from app.models.user import User
from app.schemas.appointment import AppointmentCreate, AppointmentRead, AppointmentUpdate

router = APIRouter(prefix="/appointments", tags=["appointments"])


@router.get("", response_model=list[AppointmentRead])
async def list_appointments(
    status: str | None = Query(default=None),
    staff_id: str | None = Query(default=None),
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(db_session),
):
    controller = AppointmentController(session)
    return await controller.list(current_user.tenant_id, status=status, staff_id=staff_id)


@router.post("", response_model=AppointmentRead, status_code=status.HTTP_201_CREATED)
async def create_appointment(
    data: AppointmentCreate,
    current_user: User = Depends(require_roles("owner","admin","manager","staff")),
    session: AsyncSession = Depends(db_session),
):
    controller = AppointmentController(session)
    return await controller.create(current_user.tenant_id, current_user.id, data)


@router.get("/{appointment_id}", response_model=AppointmentRead)
async def get_appointment(
    appointment_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(db_session),
):
    controller = AppointmentController(session)
    return await controller.get(current_user.tenant_id, appointment_id)


@router.put("/{appointment_id}", response_model=AppointmentRead)
async def update_appointment(
    appointment_id: uuid.UUID,
    data: AppointmentUpdate,
    current_user: User = Depends(require_roles("owner","admin","manager","staff")),
    session: AsyncSession = Depends(db_session),
):
    controller = AppointmentController(session)
    return await controller.update(current_user.tenant_id, current_user.id, appointment_id, data)


@router.delete("/{appointment_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_appointment(
    appointment_id: uuid.UUID,
    current_user: User = Depends(require_roles("owner","admin","manager")),
    session: AsyncSession = Depends(db_session),
):
    controller = AppointmentController(session)
    await controller.delete(current_user.tenant_id, current_user.id, appointment_id)
