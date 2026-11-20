"""Tenant service: business logic for tenants."""
from __future__ import annotations

import uuid
from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.tenant import Tenant
from app.schemas.auth import TenantCreate


class TenantService:
    """Service for tenant operations."""

    @staticmethod
    async def create_tenant(session: AsyncSession, data: TenantCreate) -> Tenant:
        tenant = Tenant(
            name=data.name,
            subdomain=data.subdomain,
            email=data.email,
            description=data.description,
        )
        session.add(tenant)
        await session.flush()
        return tenant

    @staticmethod
    async def get_tenant(session: AsyncSession, tenant_id: uuid.UUID) -> Optional[Tenant]:
        result = await session.execute(select(Tenant).where(Tenant.id == tenant_id))
        return result.scalar_one_or_none()

    @staticmethod
    async def get_tenant_by_subdomain(
        session: AsyncSession, subdomain: str
    ) -> Optional[Tenant]:
        result = await session.execute(
            select(Tenant).where(Tenant.subdomain == subdomain)
        )
        return result.scalar_one_or_none()
