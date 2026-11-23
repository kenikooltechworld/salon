"""Service add-on routes."""
from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.controllers.service_addon_controller import ServiceAddonController
from app.lib.deps import db_session, get_current_user, require_roles
from app.models.user import User
from app.schemas.service_addon import ServiceAddonCreate, ServiceAddonListResponse, ServiceAddonRead, ServiceAddonUpdate

router = APIRouter(prefix="/service-addons", tags=["service-addons"])


@router.get("", response_model=ServiceAddonListResponse)
async def list_addons(
    is_active: bool | None = Query(default=None),
    category: str | None = Query(default=None),
    service_id: uuid.UUID | None = Query(default=None),
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(db_session),
):
    return await ServiceAddonController(session).list(
        current_user.tenant_id, is_active=is_active, category=category, service_id=service_id
    )


@router.post("", response_model=ServiceAddonRead, status_code=status.HTTP_201_CREATED)
async def create_addon(
    data: ServiceAddonCreate,
    current_user: User = Depends(require_roles("owner","admin","manager")),
    session: AsyncSession = Depends(db_session),
):
    return await ServiceAddonController(session).create(current_user.tenant_id, data)


@router.get("/{addon_id}", response_model=ServiceAddonRead)
async def get_addon(
    addon_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(db_session),
):
    return await ServiceAddonController(session).get(current_user.tenant_id, addon_id)


@router.put("/{addon_id}", response_model=ServiceAddonRead)
async def update_addon(
    addon_id: uuid.UUID,
    data: ServiceAddonUpdate,
    current_user: User = Depends(require_roles("owner","admin","manager")),
    session: AsyncSession = Depends(db_session),
):
    return await ServiceAddonController(session).update(current_user.tenant_id, addon_id, data)


@router.delete("/{addon_id}", response_model=ServiceAddonRead)
async def delete_addon(
    addon_id: uuid.UUID,
    current_user: User = Depends(require_roles("owner","admin","manager")),
    session: AsyncSession = Depends(db_session),
):
    return await ServiceAddonController(session).delete(current_user.tenant_id, addon_id)
