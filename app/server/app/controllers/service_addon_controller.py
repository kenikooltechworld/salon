"""Service add-on controller."""
from __future__ import annotations

import uuid

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.schemas.notification import NotificationCreate
from app.schemas.service_addon import (
    ServiceAddonCreate,
    ServiceAddonListResponse,
    ServiceAddonRead,
    ServiceAddonUpdate,
)
from app.services.notification_service import NotificationService
from app.services.service_addon_service import ServiceAddonService


class ServiceAddonController:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.service = ServiceAddonService(session)
        self.notifications = NotificationService(session)

    async def list(
        self,
        tenant_id: uuid.UUID,
        *,
        is_active: bool | None = None,
        category: str | None = None,
        service_id: uuid.UUID | None = None,
        search: str | None = None,
        page: int = 1,
        page_size: int = 100,
    ) -> ServiceAddonListResponse:
        items, total = await self.service.list_addons(
            tenant_id, is_active=is_active, category=category, service_id=service_id, search=search, page=page, page_size=page_size
        )
        return ServiceAddonListResponse(addons=[ServiceAddonRead.model_validate(i) for i in items], total=total)

    async def create(self, tenant_id: uuid.UUID, actor_id: uuid.UUID, data: ServiceAddonCreate) -> ServiceAddonRead:
        item = await self.service.create(tenant_id, data)
        await self.session.flush()
        await self.notifications.create(tenant_id, NotificationCreate(recipient_id=actor_id, notification_type="service_addon.created", title="Service add-on created", content=f'Add-on "{item.name}" was created.', data={"addon_id": str(item.id)}))
        return ServiceAddonRead.model_validate(item)

    async def get(self, tenant_id: uuid.UUID, addon_id: uuid.UUID) -> ServiceAddonRead:
        item = await self.service.get(tenant_id, addon_id)
        if item is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Add-on not found")
        return ServiceAddonRead.model_validate(item)

    async def update(self, tenant_id: uuid.UUID, actor_id: uuid.UUID, addon_id: uuid.UUID, data: ServiceAddonUpdate) -> ServiceAddonRead:
        item = await self.service.update(tenant_id, addon_id, data)
        if item is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Add-on not found")
        await self.session.flush()
        await self.notifications.create(tenant_id, NotificationCreate(recipient_id=actor_id, notification_type="service_addon.updated", title="Service add-on updated", content=f'Add-on "{item.name}" was updated.', data={"addon_id": str(item.id)}))
        return ServiceAddonRead.model_validate(item)

    async def delete(self, tenant_id: uuid.UUID, actor_id: uuid.UUID, addon_id: uuid.UUID) -> ServiceAddonRead:
        item = await self.service.get(tenant_id, addon_id)
        if item is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Add-on not found")
        await self.service.delete(tenant_id, addon_id)
        await self.session.flush()
        await self.notifications.create(tenant_id, NotificationCreate(recipient_id=actor_id, notification_type="service_addon.deleted", title="Service add-on deactivated", content=f'Add-on "{item.name}" was deactivated.', data={"addon_id": str(item.id)}))
        await self.session.refresh(item)
        return ServiceAddonRead.model_validate(item)
