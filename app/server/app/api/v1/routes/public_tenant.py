"""Public tenant resolution routes."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_db
from app.models.tenant import Tenant
from app.lib.tenant_context import resolve_tenant_from_request
from app.schemas.public_tenant import PublicTenantRead

router = APIRouter(prefix="/public", tags=["public-tenant"])


def _to_public(tenant: Tenant) -> PublicTenantRead:
    return PublicTenantRead(
        id=tenant.id,
        name=tenant.name,
        subdomain=tenant.subdomain,
        description=tenant.description,
        email=tenant.email,
        phone=tenant.phone,
        logo_url=tenant.logo_url,
        primary_color=tenant.primary_color,
        secondary_color=tenant.secondary_color,
        status=tenant.status,
        is_published=tenant.is_published,
    )


@router.get("/salon-info", response_model=PublicTenantRead)
async def get_public_salon_info(request: Request, session: AsyncSession = Depends(get_db)):
    ctx = await resolve_tenant_from_request(request, session)
    if ctx is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "TENANT_CONTEXT_REQUIRED", "message": "Salon not found"},
        )
    return _to_public(ctx.tenant)


@router.get("/tenant/by-subdomain/{subdomain}", response_model=PublicTenantRead)
async def get_public_tenant_by_subdomain(subdomain: str, session: AsyncSession = Depends(get_db)):
    slug = (subdomain or "").strip().lower()
    if not slug:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Salon not found")
    result = await session.execute(select(Tenant).where(Tenant.subdomain == slug))
    tenant = result.scalar_one_or_none()
    if tenant is None or not tenant.is_published or tenant.status != "active":
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Salon not found")
    return _to_public(tenant)
