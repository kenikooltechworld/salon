"""Service category service."""
from __future__ import annotations

import uuid
from typing import Sequence

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.service import Service
from app.models.service_category import ServiceCategory
from app.schemas.service import ServiceCategoryCreate, ServiceCategoryUpdate


class ServiceCategoryService:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def list_categories(self, tenant_id: uuid.UUID) -> Sequence[ServiceCategory]:
        result = await self.session.execute(
            select(ServiceCategory)
            .where(ServiceCategory.tenant_id == tenant_id)
            .order_by(ServiceCategory.name.asc())
        )
        return result.scalars().all()

    async def create(self, tenant_id: uuid.UUID, data: ServiceCategoryCreate) -> ServiceCategory:
        await self._ensure_unique_name(tenant_id, data.name)
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
        payload = data.model_dump(exclude_unset=True)
        if "name" in payload and payload["name"] and payload["name"] != category.name:
            await self._ensure_unique_name(tenant_id, payload["name"], exclude_id=category_id)
            # Keep existing services consistent when category is renamed.
            await self.session.execute(
                Service.__table__.update()
                .where(Service.tenant_id == tenant_id, Service.category == category.name)
                .values(category=payload["name"])
            )
        for field, value in payload.items():
            setattr(category, field, value)
        await self.session.flush()
        await self.session.refresh(category)
        return category

    async def delete(self, tenant_id: uuid.UUID, category_id: uuid.UUID) -> bool:
        category = await self.get(tenant_id, category_id)
        if category is None:
            return False
        in_use = (
            await self.session.execute(
                select(func.count()).select_from(Service).where(
                    Service.tenant_id == tenant_id, Service.category == category.name
                )
            )
        ).scalar_one()
        if in_use > 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot delete category: {in_use} service(s) still use it",
            )
        await self.session.delete(category)
        await self.session.flush()
        return True

    async def _ensure_unique_name(
        self, tenant_id: uuid.UUID, name: str, *, exclude_id: uuid.UUID | None = None
    ) -> None:
        stmt = select(ServiceCategory.id).where(
            ServiceCategory.tenant_id == tenant_id,
            func.lower(ServiceCategory.name) == name.lower(),
        )
        if exclude_id is not None:
            stmt = stmt.where(ServiceCategory.id != exclude_id)
        existing = (await self.session.execute(stmt)).scalar_one_or_none()
        if existing is not None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Category with this name already exists",
            )
