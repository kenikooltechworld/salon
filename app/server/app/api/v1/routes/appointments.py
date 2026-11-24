"""Appointment routes."""
from __future__ import annotations

import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.controllers.appointment_controller import AppointmentController
from app.lib.deps import db_session, get_current_user, require_roles
from app.models.user import User
from app.schemas.appointment import AppointmentAction, AppointmentCreate, AppointmentDetailRead, AppointmentListResponse, AppointmentRead, AppointmentUpdate

router = APIRouter(prefix="/appointments", tags=["appointments"])


@router.get("", response_model=AppointmentListResponse)
async def list_appointments(
    status: str | None = Query(default=None),
    staff_id: str | None = Query(default=None),
    customer_id: str | None = Query(default=None),
    service_id: str | None = Query(default=None),
    start_date: datetime | None = Query(default=None),
    end_date: datetime | None = Query(default=None),
    search: str | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=50, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(db_session),
):
    controller = AppointmentController(session)
    return await controller.list(
        current_user.tenant_id,
        status=status,
        staff_id=staff_id,
        customer_id=customer_id,
        service_id=service_id,
        start_date=start_date,
        end_date=end_date,
        search=search,
        page=page,
        page_size=page_size,
    )


@router.post("", response_model=AppointmentRead, status_code=status.HTTP_201_CREATED)
async def create_appointment(
    data: AppointmentCreate,
    current_user: User = Depends(require_roles("owner", "admin", "manager", "staff")),
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


@router.get("/{appointment_id}/detail", response_model=AppointmentDetailRead)
async def get_appointment_detail(
    appointment_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(db_session),
):
    controller = AppointmentController(session)
    return await controller.get_detail(current_user.tenant_id, appointment_id)


@router.put("/{appointment_id}", response_model=AppointmentRead)
async def update_appointment(
    appointment_id: uuid.UUID,
    data: AppointmentUpdate,
    current_user: User = Depends(require_roles("owner", "admin", "manager", "staff")),
    session: AsyncSession = Depends(db_session),
):
    controller = AppointmentController(session)
    return await controller.update(current_user.tenant_id, current_user.id, appointment_id, data)


@router.post("/{appointment_id}/confirm", response_model=AppointmentRead)
async def confirm_appointment(
    appointment_id: uuid.UUID,
    body: AppointmentAction | None = None,
    current_user: User = Depends(require_roles("owner", "admin", "manager", "staff")),
    session: AsyncSession = Depends(db_session),
):
    return await AppointmentController(session).action(current_user.tenant_id, current_user.id, appointment_id, "confirm", body)


@router.post("/{appointment_id}/complete", response_model=AppointmentRead)
async def complete_appointment(
    appointment_id: uuid.UUID,
    body: AppointmentAction | None = None,
    current_user: User = Depends(require_roles("owner", "admin", "manager", "staff")),
    session: AsyncSession = Depends(db_session),
):
    return await AppointmentController(session).action(current_user.tenant_id, current_user.id, appointment_id, "complete", body)


@router.post("/{appointment_id}/cancel", response_model=AppointmentRead)
async def cancel_appointment(
    appointment_id: uuid.UUID,
    body: AppointmentAction | None = None,
    current_user: User = Depends(require_roles("owner", "admin", "manager", "staff")),
    session: AsyncSession = Depends(db_session),
):
    return await AppointmentController(session).action(current_user.tenant_id, current_user.id, appointment_id, "cancel", body)


@router.post("/{appointment_id}/no-show", response_model=AppointmentRead)
async def no_show_appointment(
    appointment_id: uuid.UUID,
    body: AppointmentAction | None = None,
    current_user: User = Depends(require_roles("owner", "admin", "manager", "staff")),
    session: AsyncSession = Depends(db_session),
):
    return await AppointmentController(session).action(current_user.tenant_id, current_user.id, appointment_id, "no-show", body)


@router.post("/{appointment_id}/start", response_model=AppointmentRead)
async def start_appointment(
    appointment_id: uuid.UUID,
    body: AppointmentAction | None = None,
    current_user: User = Depends(require_roles("owner", "admin", "manager", "staff")),
    session: AsyncSession = Depends(db_session),
):
    return await AppointmentController(session).action(current_user.tenant_id, current_user.id, appointment_id, "start", body)


@router.delete("/{appointment_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_appointment(
    appointment_id: uuid.UUID,
    current_user: User = Depends(require_roles("owner", "admin", "manager")),
    session: AsyncSession = Depends(db_session),
):
    controller = AppointmentController(session)
    await controller.delete(current_user.tenant_id, current_user.id, appointment_id)
