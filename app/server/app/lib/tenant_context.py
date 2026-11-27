"""Tenant subdomain context resolution for public requests."""
from __future__ import annotations

import uuid
from dataclasses import dataclass

from fastapi import HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.lib.domain_config import extract_tenant_subdomain, is_non_public_host
from app.lib.subdomain import is_valid_subdomain
from app.models.tenant import Tenant


@dataclass
class TenantContext:
    tenant: Tenant
    subdomain: str
    host: str


def request_host(request: Request) -> str:
    host = request.headers.get("x-forwarded-host") or request.headers.get("host") or ""
    # x-forwarded-host can contain multiple values
    host = host.split(",")[0].strip().lower()
    if ":" in host and not host.startswith("["):
        host = host.split(":")[0]
    return host


def host_is_tenant_candidate(request: Request) -> bool:
    host = request_host(request)
    if is_non_public_host(host):
        return False
    return extract_tenant_subdomain(host, settings.platform_domain) is not None


async def resolve_tenant_from_request(request: Request, session: AsyncSession) -> TenantContext | None:
    host = request_host(request)
    subdomain = extract_tenant_subdomain(host, settings.platform_domain)
    if not subdomain:
        header_subdomain = (request.headers.get("x-tenant-subdomain") or "").strip().lower()
        if header_subdomain and is_valid_subdomain(header_subdomain):
            subdomain = header_subdomain
    if not subdomain:
        return None

    result = await session.execute(select(Tenant).where(Tenant.subdomain == subdomain))
    tenant = result.scalar_one_or_none()
    if tenant is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "TENANT_NOT_FOUND", "message": "Salon not found"},
        )
    if not tenant.is_published or tenant.status != "active":
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "TENANT_NOT_FOUND", "message": "Salon not found"},
        )

    ctx = TenantContext(tenant=tenant, subdomain=subdomain, host=host)
    request.state.public_tenant = tenant
    request.state.public_tenant_id = tenant.id
    request.state.public_subdomain = subdomain
    return ctx


async def require_public_tenant(request: Request, session: AsyncSession) -> Tenant:
    ctx = await resolve_tenant_from_request(request, session)
    if ctx is not None:
        return ctx.tenant
    # If request is on a non-public host, caller may fallback to id-based public routes.
    # If it's a tenant-like host that we couldn't resolve, resolve_tenant_from_request raises.
    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail={"code": "TENANT_CONTEXT_REQUIRED", "message": "Tenant not found"},
    )
