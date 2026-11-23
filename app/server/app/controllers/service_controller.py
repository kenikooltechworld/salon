"""Service controller."""
from __future__ import annotations

import uuid

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.schemas.service import ServiceCreate, ServiceListResponse, ServiceRead, ServiceUpdate
from app.services.service_service import ServiceService


class ServiceController:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.service = ServiceService(session)

    async def list(
        self,
        tenant_id: uuid.UUID,
        *,
        active_only: bool = False,
        category: str | None = None,
        search: str | None = None,
        published_only: bool = False,
        page: int = 1,
        page_size: int = 20,
    ) -> ServiceListResponse:
        items, total = await self.service.list_services(
            tenant_id,
            active_only=active_only,
            category=category,
            search=search,
            published_only=published_only,
            page=page,
            page_size=page_size,
        )
        return ServiceListResponse(
            services=[ServiceRead.model_validate(i) for i in items],
            total=total,
            page=page,
            page_size=page_size,
        )

    async def create(self, tenant_id: uuid.UUID, data: ServiceCreate) -> ServiceRead:
        item = await self.service.create(tenant_id, data)
        await self.session.commit()
        return ServiceRead.model_validate(item)

    async def get(self, tenant_id: uuid.UUID, service_id: uuid.UUID) -> ServiceRead:
        item = await self.service.get(tenant_id, service_id)
        if item is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Service not found")
        return ServiceRead.model_validate(item)

    async def update(
        self, tenant_id: uuid.UUID, service_id: uuid.UUID, data: ServiceUpdate
    ) -> ServiceRead:
        item = await self.service.update(tenant_id, service_id, data)
        if item is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Service not found")
        await self.session.commit()
        return ServiceRead.model_validate(item)

    async def delete(self, tenant_id: uuid.UUID, service_id: uuid.UUID) -> ServiceRead:
        item = await self.service.get(tenant_id, service_id)
        if item is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Service not found")
        await self.service.delete(tenant_id, service_id)
        await self.session.commit()
        await self.session.refresh(item)
        return ServiceRead.model_validate(item)
