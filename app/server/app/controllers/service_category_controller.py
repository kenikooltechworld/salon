"""Service category controller."""
from __future__ import annotations

import uuid

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.schemas.service import (
    ServiceCategoryCreate,
    ServiceCategoryRead,
    ServiceCategoryUpdate,
)
from app.services.service_category_service import ServiceCategoryService


class ServiceCategoryController:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.service = ServiceCategoryService(session)

    async def list(self, tenant_id: uuid.UUID) -> list[ServiceCategoryRead]:
        items = await self.service.list_categories(tenant_id)
        return [ServiceCategoryRead.model_validate(i) for i in items]

    async def create(self, tenant_id: uuid.UUID, data: ServiceCategoryCreate) -> ServiceCategoryRead:
        item = await self.service.create(tenant_id, data)
        await self.session.commit()
        return ServiceCategoryRead.model_validate(item)

    async def get(self, tenant_id: uuid.UUID, category_id: uuid.UUID) -> ServiceCategoryRead:
        item = await self.service.get(tenant_id, category_id)
        if item is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found")
        return ServiceCategoryRead.model_validate(item)

    async def update(
        self, tenant_id: uuid.UUID, category_id: uuid.UUID, data: ServiceCategoryUpdate
    ) -> ServiceCategoryRead:
        item = await self.service.update(tenant_id, category_id, data)
        if item is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found")
        await self.session.commit()
        return ServiceCategoryRead.model_validate(item)

    async def delete(self, tenant_id: uuid.UUID, category_id: uuid.UUID) -> None:
        ok = await self.service.delete(tenant_id, category_id)
        if not ok:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found")
        await self.session.commit()
