"""Public service catalog routes (no auth)."""
from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_db
from app.lib.tenant_context import resolve_tenant_from_request
from app.models.tenant import Tenant
from app.schemas.service import ServiceCategoryListResponse, ServiceCategoryRead, ServiceListResponse, ServiceRead
from app.schemas.service_addon import ServiceAddonListResponse, ServiceAddonRead
from app.schemas.service_package import ServicePackageListResponse, ServicePackageRead
from app.services.service_addon_service import ServiceAddonService
from app.services.service_category_service import ServiceCategoryService
from app.services.service_package_service import ServicePackageService
from app.services.service_service import ServiceService

router = APIRouter(prefix="/public", tags=["public-services"])


async def _tenant(session: AsyncSession, tenant_id: uuid.UUID) -> Tenant:
    tenant = await session.get(Tenant, tenant_id)
    if tenant is None or not tenant.is_published or tenant.status != "active":
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Salon not found")
    return tenant


async def _tenant_from_subdomain(request: Request, session: AsyncSession) -> Tenant:
    ctx = await resolve_tenant_from_request(request, session)
    if ctx is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Salon not found")
    return ctx.tenant


@router.get("/{tenant_id}/service-categories", response_model=ServiceCategoryListResponse)
async def public_service_categories(tenant_id: uuid.UUID, session: AsyncSession = Depends(get_db)):
    await _tenant(session, tenant_id)
    items = await ServiceCategoryService(session).list_categories(tenant_id)
    active = [ServiceCategoryRead.model_validate(i) for i in items if i.is_active]
    return ServiceCategoryListResponse(categories=active, total=len(active))


@router.get("/{tenant_id}/services", response_model=ServiceListResponse)
async def public_services(
    tenant_id: uuid.UUID,
    category: str | None = Query(default=None),
    search: str | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    session: AsyncSession = Depends(get_db),
):
    await _tenant(session, tenant_id)
    items, total = await ServiceService(session).list_services(
        tenant_id, active_only=True, published_only=True, category=category, search=search, page=page, page_size=page_size
    )
    return ServiceListResponse(services=[ServiceRead.model_validate(i) for i in items], total=total, page=page, page_size=page_size)


@router.get("/{tenant_id}/services/{service_id}", response_model=ServiceRead)
async def public_service(tenant_id: uuid.UUID, service_id: uuid.UUID, session: AsyncSession = Depends(get_db)):
    await _tenant(session, tenant_id)
    item = await ServiceService(session).get(tenant_id, service_id)
    if item is None or not item.is_active or not item.is_published:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Service not found")
    return ServiceRead.model_validate(item)


@router.get("/{tenant_id}/service-addons", response_model=ServiceAddonListResponse)
async def public_service_addons(
    tenant_id: uuid.UUID,
    service_id: uuid.UUID | None = Query(default=None),
    category: str | None = Query(default=None),
    session: AsyncSession = Depends(get_db),
):
    await _tenant(session, tenant_id)
    items = await ServiceAddonService(session).list_addons(tenant_id, is_active=True, category=category, service_id=service_id)
    return ServiceAddonListResponse(addons=[ServiceAddonRead.model_validate(i) for i in items], total=len(items))


@router.get("/{tenant_id}/service-packages", response_model=ServicePackageListResponse)
async def public_service_packages(
    tenant_id: uuid.UUID,
    is_featured: bool | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    session: AsyncSession = Depends(get_db),
):
    await _tenant(session, tenant_id)
    svc = ServicePackageService(session)
    items, total = await svc.list_packages(tenant_id, is_active=True, is_featured=is_featured, include_expired=False, page=page, page_size=page_size)
    packages = []
    for i in items:
        read = await svc.to_read(tenant_id, i)
        if read.is_valid:
            packages.append(read)
    return ServicePackageListResponse(packages=packages, total=len(packages), page=page, page_size=page_size)


@router.get("/{tenant_id}/service-packages/{package_id}", response_model=ServicePackageRead)
async def public_service_package(tenant_id: uuid.UUID, package_id: uuid.UUID, session: AsyncSession = Depends(get_db)):
    await _tenant(session, tenant_id)
    svc = ServicePackageService(session)
    item = await svc.get(tenant_id, package_id)
    if item is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Package not found")
    read = await svc.to_read(tenant_id, item)
    if not read.is_valid:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Package not found")
    return read


# --- Host/subdomain-resolved public endpoints (legacy-compatible paths) ---

@router.get("/service-categories", response_model=ServiceCategoryListResponse)
async def public_service_categories_by_host(request: Request, session: AsyncSession = Depends(get_db)):
    tenant = await _tenant_from_subdomain(request, session)
    items = await ServiceCategoryService(session).list_categories(tenant.id)
    active = [ServiceCategoryRead.model_validate(i) for i in items if i.is_active]
    return ServiceCategoryListResponse(categories=active, total=len(active))


@router.get("/services", response_model=ServiceListResponse)
async def public_services_by_host(
    request: Request,
    category: str | None = Query(default=None),
    search: str | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    session: AsyncSession = Depends(get_db),
):
    tenant = await _tenant_from_subdomain(request, session)
    items, total = await ServiceService(session).list_services(
        tenant.id, active_only=True, published_only=True, category=category, search=search, page=page, page_size=page_size
    )
    return ServiceListResponse(services=[ServiceRead.model_validate(i) for i in items], total=total, page=page, page_size=page_size)


@router.get("/services/{service_id}", response_model=ServiceRead)
async def public_service_by_host(service_id: uuid.UUID, request: Request, session: AsyncSession = Depends(get_db)):
    tenant = await _tenant_from_subdomain(request, session)
    item = await ServiceService(session).get(tenant.id, service_id)
    if item is None or not item.is_active or not item.is_published:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Service not found")
    return ServiceRead.model_validate(item)


@router.get("/service-addons", response_model=ServiceAddonListResponse)
async def public_service_addons_by_host(
    request: Request,
    service_id: uuid.UUID | None = Query(default=None),
    category: str | None = Query(default=None),
    session: AsyncSession = Depends(get_db),
):
    tenant = await _tenant_from_subdomain(request, session)
    items = await ServiceAddonService(session).list_addons(tenant.id, is_active=True, category=category, service_id=service_id)
    return ServiceAddonListResponse(addons=[ServiceAddonRead.model_validate(i) for i in items], total=len(items))


@router.get("/service-addons/{service_id}", response_model=list[ServiceAddonRead])
async def public_service_addons_for_service(service_id: uuid.UUID, request: Request, session: AsyncSession = Depends(get_db)):
    tenant = await _tenant_from_subdomain(request, session)
    items = await ServiceAddonService(session).list_addons(tenant.id, is_active=True, service_id=service_id)
    return [ServiceAddonRead.model_validate(i) for i in items]


@router.get("/service-packages", response_model=ServicePackageListResponse)
async def public_service_packages_by_host(
    request: Request,
    is_featured: bool | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    session: AsyncSession = Depends(get_db),
):
    tenant = await _tenant_from_subdomain(request, session)
    svc = ServicePackageService(session)
    items, total = await svc.list_packages(tenant.id, is_active=True, is_featured=is_featured, include_expired=False, page=page, page_size=page_size)
    packages = []
    for i in items:
        read = await svc.to_read(tenant.id, i)
        if read.is_valid:
            packages.append(read)
    return ServicePackageListResponse(packages=packages, total=len(packages), page=page, page_size=page_size)


@router.get("/service-packages/{package_id}", response_model=ServicePackageRead)
async def public_service_package_by_host(package_id: uuid.UUID, request: Request, session: AsyncSession = Depends(get_db)):
    tenant = await _tenant_from_subdomain(request, session)
    svc = ServicePackageService(session)
    item = await svc.get(tenant.id, package_id)
    if item is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Package not found")
    read = await svc.to_read(tenant.id, item)
    if not read.is_valid:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Package not found")
    return read
