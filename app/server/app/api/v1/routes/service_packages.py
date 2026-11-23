"""Service package routes."""
from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.controllers.service_package_controller import ServicePackageController
from app.lib.deps import db_session, get_current_user
from app.models.user import User
from app.schemas.service_package import (
    ServicePackageCreate,
    ServicePackageListResponse,
    ServicePackageRead,
    ServicePackageUpdate,
)

router = APIRouter(prefix="/service-packages", tags=["service-packages"])


@router.get("", response_model=ServicePackageListResponse)
async def list_packages(
    is_active: bool | None = Query(default=None),
    is_featured: bool | None = Query(default=None),
    include_expired: bool = Query(default=False),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(db_session),
):
    return await ServicePackageController(session).list(
        current_user.tenant_id,
        is_active=is_active,
        is_featured=is_featured,
        include_expired=include_expired,
        page=page,
        page_size=page_size,
    )


@router.post("", response_model=ServicePackageRead, status_code=status.HTTP_201_CREATED)
async def create_package(
    data: ServicePackageCreate,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(db_session),
):
    return await ServicePackageController(session).create(current_user.tenant_id, data, current_user.id)


@router.get("/{package_id}", response_model=ServicePackageRead)
async def get_package(
    package_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(db_session),
):
    return await ServicePackageController(session).get(current_user.tenant_id, package_id)


@router.put("/{package_id}", response_model=ServicePackageRead)
async def update_package(
    package_id: uuid.UUID,
    data: ServicePackageUpdate,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(db_session),
):
    return await ServicePackageController(session).update(current_user.tenant_id, package_id, data, current_user.id)


@router.delete("/{package_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_package(
    package_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(db_session),
):
    await ServicePackageController(session).delete(current_user.tenant_id, package_id)
