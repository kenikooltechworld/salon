"""Staff routes."""
from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.controllers.staff_controller import StaffController
from app.lib.deps import db_session, get_current_user, require_roles
from app.models.user import User
from app.schemas.staff import StaffCreate, StaffRead, StaffUpdate

router = APIRouter(prefix="/staff", tags=["staff"])


@router.get("", response_model=list[StaffRead])
async def list_staff(
    status: str | None = Query(default=None),
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(db_session),
):
    controller = StaffController(session)
    return await controller.list(current_user.tenant_id, status=status)


@router.post("", response_model=StaffRead, status_code=status.HTTP_201_CREATED)
async def create_staff(
    data: StaffCreate,
    current_user: User = Depends(require_roles("owner","admin","manager")),
    session: AsyncSession = Depends(db_session),
):
    controller = StaffController(session)
    return await controller.create(current_user.tenant_id, data)


@router.get("/{staff_id}", response_model=StaffRead)
async def get_staff(
    staff_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(db_session),
):
    controller = StaffController(session)
    return await controller.get(current_user.tenant_id, staff_id)


@router.put("/{staff_id}", response_model=StaffRead)
async def update_staff(
    staff_id: uuid.UUID,
    data: StaffUpdate,
    current_user: User = Depends(require_roles("owner","admin","manager")),
    session: AsyncSession = Depends(db_session),
):
    controller = StaffController(session)
    return await controller.update(current_user.tenant_id, staff_id, data)


@router.delete("/{staff_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_staff(
    staff_id: uuid.UUID,
    current_user: User = Depends(require_roles("owner","admin","manager")),
    session: AsyncSession = Depends(db_session),
):
    controller = StaffController(session)
    await controller.delete(current_user.tenant_id, staff_id)
