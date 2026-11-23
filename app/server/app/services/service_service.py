"""Service service."""
from __future__ import annotations

import uuid
from typing import Sequence

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.service import Service
from app.models.staff import Staff
from app.schemas.service import ServiceCreate, ServiceUpdate


class ServiceService:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def list_services(
        self,
        tenant_id: uuid.UUID,
        *,
        active_only: bool = False,
        category: str | None = None,
        search: str | None = None,
        published_only: bool = False,
        page: int = 1,
        page_size: int = 20,
    ) -> tuple[Sequence[Service], int]:
        stmt = select(Service).where(Service.tenant_id == tenant_id)
        count_stmt = select(func.count()).select_from(Service).where(Service.tenant_id == tenant_id)

        if active_only:
            stmt = stmt.where(Service.is_active.is_(True))
            count_stmt = count_stmt.where(Service.is_active.is_(True))
        if published_only:
            stmt = stmt.where(Service.is_published.is_(True))
            count_stmt = count_stmt.where(Service.is_published.is_(True))
        if category:
            stmt = stmt.where(Service.category == category)
            count_stmt = count_stmt.where(Service.category == category)
        if search:
            pattern = f"%{search.strip()}%"
            search_filter = Service.name.ilike(pattern) | Service.description.ilike(pattern)
            stmt = stmt.where(search_filter)
            count_stmt = count_stmt.where(search_filter)

        total = (await self.session.execute(count_stmt)).scalar_one()
        stmt = stmt.order_by(Service.created_at.desc()).offset((page - 1) * page_size).limit(page_size)
        result = await self.session.execute(stmt)
        return result.scalars().all(), total

    async def create(self, tenant_id: uuid.UUID, data: ServiceCreate) -> Service:
        payload = data.model_dump()
        await self._validate_staff_ids(tenant_id, payload.get("staff_ids", []))
        service = Service(tenant_id=tenant_id, **payload)
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
        payload = data.model_dump(exclude_unset=True)
        if "staff_ids" in payload:
            await self._validate_staff_ids(tenant_id, payload.get("staff_ids") or [])
        for field, value in payload.items():
            setattr(service, field, value)
        await self.session.flush()
        await self.session.refresh(service)
        return service

    async def delete(self, tenant_id: uuid.UUID, service_id: uuid.UUID) -> bool:
        """Soft-delete: mark service inactive to preserve history."""
        service = await self.get(tenant_id, service_id)
        if service is None:
            return False
        service.is_active = False
        service.allow_public_booking = False
        await self.session.flush()
        await self.session.refresh(service)
        return True

    async def _validate_staff_ids(self, tenant_id: uuid.UUID, staff_ids: list[uuid.UUID]) -> None:
        if not staff_ids:
            return
        unique_ids = list(dict.fromkeys(staff_ids))
        result = await self.session.execute(
            select(Staff.id).where(Staff.tenant_id == tenant_id, Staff.id.in_(unique_ids))
        )
        found = set(result.scalars().all())
        missing = [str(sid) for sid in unique_ids if sid not in found]
        if missing:
            from fastapi import HTTPException, status

            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid staff_ids for tenant: {', '.join(missing)}",
            )
