"""Service category routes."""
from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.controllers.service_category_controller import ServiceCategoryController
from app.lib.deps import db_session, get_current_user, require_roles
from app.models.user import User
from app.schemas.service import (
    ServiceCategoryCreate,
    ServiceCategoryListResponse,
    ServiceCategoryRead,
    ServiceCategoryUpdate,
)

router = APIRouter(prefix="/service-categories", tags=["service-categories"])


@router.get("", response_model=ServiceCategoryListResponse)
async def list_categories(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(db_session),
):
    controller = ServiceCategoryController(session)
    return await controller.list(current_user.tenant_id)


@router.post("", response_model=ServiceCategoryRead, status_code=status.HTTP_201_CREATED)
async def create_category(
    data: ServiceCategoryCreate,
    current_user: User = Depends(require_roles("owner","admin","manager")),
    session: AsyncSession = Depends(db_session),
):
    controller = ServiceCategoryController(session)
    return await controller.create(current_user.tenant_id, current_user.id, data)


@router.get("/{category_id}", response_model=ServiceCategoryRead)
async def get_category(
    category_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(db_session),
):
    controller = ServiceCategoryController(session)
    return await controller.get(current_user.tenant_id, category_id)


@router.put("/{category_id}", response_model=ServiceCategoryRead)
async def update_category(
    category_id: uuid.UUID,
    data: ServiceCategoryUpdate,
    current_user: User = Depends(require_roles("owner","admin","manager")),
    session: AsyncSession = Depends(db_session),
):
    controller = ServiceCategoryController(session)
    return await controller.update(current_user.tenant_id, current_user.id, category_id, data)


@router.delete("/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_category(
    category_id: uuid.UUID,
    current_user: User = Depends(require_roles("owner","admin","manager")),
    session: AsyncSession = Depends(db_session),
):
    controller = ServiceCategoryController(session)
    await controller.delete(current_user.tenant_id, current_user.id, category_id)
