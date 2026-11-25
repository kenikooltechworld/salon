"""Staff routes."""
from __future__ import annotations

import uuid

from fastapi import APIRouter, Body, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.controllers.staff_controller import StaffController
from app.lib.deps import db_session, get_current_user, require_roles
from app.models.user import User
from app.schemas.staff import StaffCreate, StaffListResponse, StaffRead, StaffUpdate

router = APIRouter(prefix="/staff", tags=["staff"])


@router.get("", response_model=StaffListResponse)
async def list_staff(
    status: str | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(db_session),
):
    controller = StaffController(session)
    return await controller.list(current_user.tenant_id, status=status, page=page, page_size=page_size)


@router.post("", response_model=StaffRead, status_code=status.HTTP_201_CREATED)
async def create_staff(
    data: StaffCreate,
    current_user: User = Depends(require_roles("owner", "admin", "manager")),
    session: AsyncSession = Depends(db_session),
):
    controller = StaffController(session)
    return await controller.create(current_user.tenant_id, data)


@router.get("/user/{user_id}", response_model=StaffRead)
async def get_staff_by_user(
    user_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(db_session),
):
    controller = StaffController(session)
    return await controller.get_by_user(current_user.tenant_id, user_id)


@router.put("/user/{user_id}", response_model=StaffRead)
async def update_staff_by_user(
    user_id: uuid.UUID,
    data: StaffUpdate,
    current_user: User = Depends(require_roles("owner", "admin", "manager")),
    session: AsyncSession = Depends(db_session),
):
    controller = StaffController(session)
    return await controller.update_by_user(current_user.tenant_id, user_id, data)


@router.get("/user/{user_id}/payment-structure")
async def get_staff_payment_structure_by_user(
    user_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(db_session),
):
    controller = StaffController(session)
    return await controller.payment_structure_by_user(current_user.tenant_id, user_id)


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
    current_user: User = Depends(require_roles("owner", "admin", "manager")),
    session: AsyncSession = Depends(db_session),
):
    controller = StaffController(session)
    return await controller.update(current_user.tenant_id, staff_id, data)


@router.delete("/{staff_id}")
async def delete_staff(
    staff_id: uuid.UUID,
    current_user: User = Depends(require_roles("owner", "admin", "manager")),
    session: AsyncSession = Depends(db_session),
):
    controller = StaffController(session)
    return await controller.delete(current_user.tenant_id, staff_id)


@router.post("/{staff_id}/terminate")
async def terminate_staff(
    staff_id: uuid.UUID,
    current_user: User = Depends(require_roles("owner", "admin", "manager")),
    session: AsyncSession = Depends(db_session),
):
    controller = StaffController(session)
    return await controller.terminate(current_user.tenant_id, staff_id)


@router.post("/{staff_id}/certificates")
async def upload_staff_certificate(
    staff_id: uuid.UUID,
    payload: dict = Body(...),
    current_user: User = Depends(require_roles("owner", "admin", "manager")),
    session: AsyncSession = Depends(db_session),
):
    controller = StaffController(session)
    base64_data = str(payload.get("base64_data") or "")
    return await controller.upload_certificate(current_user.tenant_id, staff_id, base64_data)


@router.delete("/{staff_id}/certificates/{file_url:path}")
async def delete_staff_certificate(
    staff_id: uuid.UUID,
    file_url: str,
    current_user: User = Depends(require_roles("owner", "admin", "manager")),
    session: AsyncSession = Depends(db_session),
):
    controller = StaffController(session)
    return await controller.delete_certificate(current_user.tenant_id, staff_id, file_url)


@router.get("/{staff_id}/payment-structure")
async def get_staff_payment_structure(
    staff_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(db_session),
):
    controller = StaffController(session)
    return await controller.payment_structure(current_user.tenant_id, staff_id)


@router.get("/{staff_id}/metrics")
async def get_staff_metrics(
    staff_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(db_session),
):
    controller = StaffController(session)
    return await controller.metrics(current_user.tenant_id, staff_id)


@router.get("/{staff_id}/activity-feed")
async def get_staff_activity_feed(
    staff_id: uuid.UUID,
    limit: int = Query(default=10, ge=1, le=50),
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(db_session),
):
    controller = StaffController(session)
    return await controller.activity_feed(current_user.tenant_id, staff_id, limit=limit)


@router.get("/{staff_id}/performance-metrics")
async def get_staff_performance_metrics(
    staff_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(db_session),
):
    controller = StaffController(session)
    return await controller.performance_metrics(current_user.tenant_id, staff_id)


@router.get("/{staff_id}/reviews")
async def get_staff_reviews(
    staff_id: uuid.UUID,
    limit: int = Query(default=25, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(db_session),
):
    controller = StaffController(session)
    return await controller.reviews(current_user.tenant_id, staff_id, limit=limit)
