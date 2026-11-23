"""Service category controller."""
from __future__ import annotations

import uuid

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.schemas.notification import NotificationCreate
from app.schemas.service import (
    ServiceCategoryCreate,
    ServiceCategoryListResponse,
    ServiceCategoryRead,
    ServiceCategoryUpdate,
)
from app.services.notification_service import NotificationService
from app.services.service_category_service import ServiceCategoryService


class ServiceCategoryController:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.service = ServiceCategoryService(session)
        self.notifications = NotificationService(session)

    async def list(self, tenant_id: uuid.UUID) -> ServiceCategoryListResponse:
        items = await self.service.list_categories(tenant_id)
        return ServiceCategoryListResponse(
            categories=[ServiceCategoryRead.model_validate(i) for i in items],
            total=len(items),
        )

    async def create(self, tenant_id: uuid.UUID, actor_id: uuid.UUID, data: ServiceCategoryCreate) -> ServiceCategoryRead:
        item = await self.service.create(tenant_id, data)
        await self.session.flush()
        await self.notifications.create(tenant_id, NotificationCreate(recipient_id=actor_id, notification_type="service_category.created", title="Service category created", content=f'Category "{item.name}" was created.', data={"category_id": str(item.id)}))
        return ServiceCategoryRead.model_validate(item)

    async def get(self, tenant_id: uuid.UUID, category_id: uuid.UUID) -> ServiceCategoryRead:
        item = await self.service.get(tenant_id, category_id)
        if item is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found")
        return ServiceCategoryRead.model_validate(item)

    async def update(
        self, tenant_id: uuid.UUID, actor_id: uuid.UUID, category_id: uuid.UUID, data: ServiceCategoryUpdate
    ) -> ServiceCategoryRead:
        item = await self.service.update(tenant_id, category_id, data)
        if item is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found")
        await self.session.flush()
        await self.notifications.create(tenant_id, NotificationCreate(recipient_id=actor_id, notification_type="service_category.updated", title="Service category updated", content=f'Category "{item.name}" was updated.', data={"category_id": str(item.id)}))
        return ServiceCategoryRead.model_validate(item)

    async def delete(self, tenant_id: uuid.UUID, actor_id: uuid.UUID, category_id: uuid.UUID) -> None:
        item = await self.service.get(tenant_id, category_id)
        if item is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found")
        name = item.name
        ok = await self.service.delete(tenant_id, category_id)
        if not ok:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found")
        await self.session.flush()
        await self.notifications.create(tenant_id, NotificationCreate(recipient_id=actor_id, notification_type="service_category.deleted", title="Service category deleted", content=f'Category "{name}" was deleted.', data={"category_id": str(category_id)}))
