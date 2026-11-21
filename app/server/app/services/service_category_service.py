"""Service category service."""
from __future__ import annotations

import uuid
from typing import Sequence

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.service_category import ServiceCategory
from app.schemas.service import ServiceCategoryCreate, ServiceCategoryUpdate


class ServiceCategoryService:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def list_categories(self, tenant_id: uuid.UUID) -> Sequence[ServiceCategory]:
        result = await self.session.execute(
            select(ServiceCategory)
            .where(ServiceCategory.tenant_id == tenant_id)
            .order_by(ServiceCategory.created_at.desc())
        )
        return result.scalars().all()

    async def create(self, tenant_id: uuid.UUID, data: ServiceCategoryCreate) -> ServiceCategory:
        category = ServiceCategory(tenant_id=tenant_id, **data.model_dump())
        self.session.add(category)
        await self.session.flush()
        await self.session.refresh(category)
        return category

    async def get(self, tenant_id: uuid.UUID, category_id: uuid.UUID) -> ServiceCategory | None:
        result = await self.session.execute(
            select(ServiceCategory).where(
                ServiceCategory.id == category_id,
                ServiceCategory.tenant_id == tenant_id,
            )
        )
        return result.scalar_one_or_none()

    async def update(
        self, tenant_id: uuid.UUID, category_id: uuid.UUID, data: ServiceCategoryUpdate
    ) -> ServiceCategory | None:
        category = await self.get(tenant_id, category_id)
        if category is None:
            return None
        for field, value in data.model_dump(exclude_unset=True).items():
            setattr(category, field, value)
        await self.session.flush()
        await self.session.refresh(category)
        return category

    async def delete(self, tenant_id: uuid.UUID, category_id: uuid.UUID) -> bool:
        category = await self.get(tenant_id, category_id)
        if category is None:
            return False
        await self.session.delete(category)
        await self.session.flush()
        return True
