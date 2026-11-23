"""Service add-on service."""
from __future__ import annotations

import uuid
from typing import Sequence

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.service import Service
from app.models.service_addon import ServiceAddon
from app.schemas.service_addon import ServiceAddonCreate, ServiceAddonUpdate


class ServiceAddonService:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def list_addons(
        self,
        tenant_id: uuid.UUID,
        *,
        is_active: bool | None = None,
        category: str | None = None,
        service_id: uuid.UUID | None = None,
        search: str | None = None,
        page: int = 1,
        page_size: int = 100,
    ) -> tuple[Sequence[ServiceAddon], int]:
        stmt = select(ServiceAddon).where(ServiceAddon.tenant_id == tenant_id)
        count_stmt = select(func.count()).select_from(ServiceAddon).where(ServiceAddon.tenant_id == tenant_id)
        if is_active is not None:
            stmt = stmt.where(ServiceAddon.is_active.is_(is_active))
            count_stmt = count_stmt.where(ServiceAddon.is_active.is_(is_active))
        if category:
            stmt = stmt.where(ServiceAddon.category == category)
            count_stmt = count_stmt.where(ServiceAddon.category == category)
        if service_id is not None:
            stmt = stmt.where(ServiceAddon.applicable_service_ids.any(service_id))
            count_stmt = count_stmt.where(ServiceAddon.applicable_service_ids.any(service_id))
        if search:
            pattern = f"%{search.strip()}%"
            f = ServiceAddon.name.ilike(pattern) | ServiceAddon.description.ilike(pattern)
            stmt = stmt.where(f)
            count_stmt = count_stmt.where(f)
        total = (await self.session.execute(count_stmt)).scalar_one()
        stmt = stmt.order_by(ServiceAddon.display_order.asc(), ServiceAddon.created_at.desc()).offset((page - 1) * page_size).limit(page_size)
        result = await self.session.execute(stmt)
        return result.scalars().all(), total

    async def get(self, tenant_id: uuid.UUID, addon_id: uuid.UUID) -> ServiceAddon | None:
        result = await self.session.execute(
            select(ServiceAddon).where(ServiceAddon.id == addon_id, ServiceAddon.tenant_id == tenant_id)
        )
        return result.scalar_one_or_none()

    async def create(self, tenant_id: uuid.UUID, data: ServiceAddonCreate) -> ServiceAddon:
        payload = data.model_dump(exclude={"applicable_services"})
        await self._validate_services(tenant_id, payload.get("applicable_service_ids", []))
        addon = ServiceAddon(tenant_id=tenant_id, **payload)
        self.session.add(addon)
        await self.session.flush()
        await self.session.refresh(addon)
        return addon

    async def update(
        self, tenant_id: uuid.UUID, addon_id: uuid.UUID, data: ServiceAddonUpdate
    ) -> ServiceAddon | None:
        addon = await self.get(tenant_id, addon_id)
        if addon is None:
            return None
        payload = data.model_dump(exclude_unset=True, exclude={"applicable_services"})
        if "applicable_service_ids" in payload:
            await self._validate_services(tenant_id, payload.get("applicable_service_ids") or [])
        for field, value in payload.items():
            setattr(addon, field, value)
        await self.session.flush()
        await self.session.refresh(addon)
        return addon

    async def delete(self, tenant_id: uuid.UUID, addon_id: uuid.UUID) -> bool:
        addon = await self.get(tenant_id, addon_id)
        if addon is None:
            return False
        addon.is_active = False
        await self.session.flush()
        await self.session.refresh(addon)
        return True

    async def _validate_services(self, tenant_id: uuid.UUID, service_ids: list[uuid.UUID]) -> None:
        if not service_ids:
            return
        unique_ids = list(dict.fromkeys(service_ids))
        result = await self.session.execute(
            select(Service.id).where(Service.tenant_id == tenant_id, Service.id.in_(unique_ids))
        )
        found = set(result.scalars().all())
        missing = [str(sid) for sid in unique_ids if sid not in found]
        if missing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid applicable_service_ids: {', '.join(missing)}",
            )
