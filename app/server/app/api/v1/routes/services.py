"""Service routes."""
from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.controllers.service_controller import ServiceController
from app.lib.deps import db_session, get_current_user, require_roles
from app.models.user import User
from app.schemas.service import ServiceCreate, ServiceListResponse, ServiceRead, ServiceUpdate

router = APIRouter(prefix="/services", tags=["services"])


@router.get("", response_model=ServiceListResponse)
async def list_services(
    active_only: bool | None = Query(default=None),
    is_active: bool | None = Query(default=None),
    category: str | None = Query(default=None),
    search: str | None = Query(default=None),
    published_only: bool = Query(default=False),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(db_session),
):
    controller = ServiceController(session)
    effective_active_only = active_only if active_only is not None else (is_active is True)
    # legacy behavior: list excludes inactive by default when no filter is explicitly requested
    if active_only is None and is_active is None and not published_only:
        effective_active_only = True
    return await controller.list(
        current_user.tenant_id,
        active_only=effective_active_only,
        category=category,
        search=search,
        published_only=published_only,
        page=page,
        page_size=page_size,
    )


@router.post("", response_model=ServiceRead, status_code=status.HTTP_201_CREATED)
async def create_service(
    data: ServiceCreate,
    current_user: User = Depends(require_roles("owner","admin","manager")),
    session: AsyncSession = Depends(db_session),
):
    controller = ServiceController(session)
    return await controller.create(current_user.tenant_id, current_user.id, data)


@router.get("/{service_id}", response_model=ServiceRead)
async def get_service(
    service_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(db_session),
):
    controller = ServiceController(session)
    return await controller.get(current_user.tenant_id, service_id)


@router.put("/{service_id}", response_model=ServiceRead)
async def update_service(
    service_id: uuid.UUID,
    data: ServiceUpdate,
    current_user: User = Depends(require_roles("owner","admin","manager")),
    session: AsyncSession = Depends(db_session),
):
    controller = ServiceController(session)
    return await controller.update(current_user.tenant_id, current_user.id, service_id, data)


@router.delete("/{service_id}")
async def delete_service(
    service_id: uuid.UUID,
    current_user: User = Depends(require_roles("owner","admin","manager")),
    session: AsyncSession = Depends(db_session),
):
    """Permanent delete if no records; otherwise deactivates service to preserve history."""
    controller = ServiceController(session)
    return await controller.delete(current_user.tenant_id, current_user.id, service_id)
