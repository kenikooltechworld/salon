"""Service service."""
from __future__ import annotations

import uuid
from typing import Sequence

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.service import Service
from app.schemas.service import ServiceCreate, ServiceUpdate


class ServiceService:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def list_services(
        self, tenant_id: uuid.UUID, *, active_only: bool = False
    ) -> Sequence[Service]:
        stmt = select(Service).where(Service.tenant_id == tenant_id)
        if active_only:
            stmt = stmt.where(Service.is_active.is_(True))
        stmt = stmt.order_by(Service.created_at.desc())
        result = await self.session.execute(stmt)
        return result.scalars().all()

    async def create(self, tenant_id: uuid.UUID, data: ServiceCreate) -> Service:
        service = Service(tenant_id=tenant_id, **data.model_dump())
        self.session.add(service)
        await self.session.flush()
        await self.session.refresh(service)
        return service

    async def get(self, tenant_id: uuid.UUID, service_id: uuid.UUID) -> Service | None:
        result = await self.session.execute(
            select(Service).where(Service.id == service_id, Service.tenant_id == tenant_id)
        )
        return result.scalar_one_or_none()

    async def update(
        self, tenant_id: uuid.UUID, service_id: uuid.UUID, data: ServiceUpdate
    ) -> Service | None:
        service = await self.get(tenant_id, service_id)
        if service is None:
            return None
        for field, value in data.model_dump(exclude_unset=True).items():
            setattr(service, field, value)
        await self.session.flush()
        await self.session.refresh(service)
        return service

    async def delete(self, tenant_id: uuid.UUID, service_id: uuid.UUID) -> bool:
        service = await self.get(tenant_id, service_id)
        if service is None:
            return False
        await self.session.delete(service)
        await self.session.flush()
        return True
