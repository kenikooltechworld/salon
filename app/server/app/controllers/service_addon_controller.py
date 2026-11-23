"""Service add-on controller."""
from __future__ import annotations

import uuid

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.schemas.service_addon import (
    ServiceAddonCreate,
    ServiceAddonListResponse,
    ServiceAddonRead,
    ServiceAddonUpdate,
)
from app.services.service_addon_service import ServiceAddonService


class ServiceAddonController:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.service = ServiceAddonService(session)

    async def list(
        self,
        tenant_id: uuid.UUID,
        *,
        is_active: bool | None = None,
        category: str | None = None,
        service_id: uuid.UUID | None = None,
    ) -> ServiceAddonListResponse:
        items = await self.service.list_addons(
            tenant_id, is_active=is_active, category=category, service_id=service_id
        )
        return ServiceAddonListResponse(addons=[ServiceAddonRead.model_validate(i) for i in items], total=len(items))

    async def create(self, tenant_id: uuid.UUID, data: ServiceAddonCreate) -> ServiceAddonRead:
        item = await self.service.create(tenant_id, data)
        await self.session.commit()
        return ServiceAddonRead.model_validate(item)

    async def get(self, tenant_id: uuid.UUID, addon_id: uuid.UUID) -> ServiceAddonRead:
        item = await self.service.get(tenant_id, addon_id)
        if item is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Add-on not found")
        return ServiceAddonRead.model_validate(item)

    async def update(self, tenant_id: uuid.UUID, addon_id: uuid.UUID, data: ServiceAddonUpdate) -> ServiceAddonRead:
        item = await self.service.update(tenant_id, addon_id, data)
        if item is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Add-on not found")
        await self.session.commit()
        return ServiceAddonRead.model_validate(item)

    async def delete(self, tenant_id: uuid.UUID, addon_id: uuid.UUID) -> ServiceAddonRead:
        item = await self.service.get(tenant_id, addon_id)
        if item is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Add-on not found")
        await self.service.delete(tenant_id, addon_id)
        await self.session.commit()
        await self.session.refresh(item)
        return ServiceAddonRead.model_validate(item)
