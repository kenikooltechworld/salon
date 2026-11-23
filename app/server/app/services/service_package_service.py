"""Service package service."""
from __future__ import annotations

import uuid
from datetime import datetime, timezone
from decimal import Decimal
from typing import Sequence

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.service import Service
from app.models.service_package import ServicePackage
from app.schemas.service_package import (
    ServicePackageCreate,
    ServicePackageItemRead,
    ServicePackageRead,
    ServicePackageUpdate,
)


class ServicePackageService:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def list_packages(
        self,
        tenant_id: uuid.UUID,
        *,
        is_active: bool | None = None,
        is_featured: bool | None = None,
        include_expired: bool = False,
        page: int = 1,
        page_size: int = 20,
    ) -> tuple[Sequence[ServicePackage], int]:
        stmt = select(ServicePackage).where(ServicePackage.tenant_id == tenant_id)
        count_stmt = select(func.count()).select_from(ServicePackage).where(ServicePackage.tenant_id == tenant_id)
        if is_active is not None:
            stmt = stmt.where(ServicePackage.is_active.is_(is_active))
            count_stmt = count_stmt.where(ServicePackage.is_active.is_(is_active))
        if is_featured is not None:
            stmt = stmt.where(ServicePackage.is_featured.is_(is_featured))
            count_stmt = count_stmt.where(ServicePackage.is_featured.is_(is_featured))
        if not include_expired:
            now = datetime.now(timezone.utc)
            expiry_filter = (ServicePackage.valid_until.is_(None)) | (ServicePackage.valid_until > now)
            stmt = stmt.where(expiry_filter)
            count_stmt = count_stmt.where(expiry_filter)
        total = (await self.session.execute(count_stmt)).scalar_one()
        stmt = (
            stmt.order_by(ServicePackage.is_featured.desc(), ServicePackage.display_order.asc(), ServicePackage.created_at.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
        )
        result = await self.session.execute(stmt)
        return result.scalars().all(), total

    async def get(self, tenant_id: uuid.UUID, package_id: uuid.UUID) -> ServicePackage | None:
        result = await self.session.execute(
            select(ServicePackage).where(ServicePackage.id == package_id, ServicePackage.tenant_id == tenant_id)
        )
        return result.scalar_one_or_none()

    async def create(self, tenant_id: uuid.UUID, data: ServicePackageCreate, user_id: uuid.UUID | None) -> ServicePackage:
        services_payload, original_price, _ = await self._resolve_services(tenant_id, data.services)
        discount_amount, discount_percentage = self._compute_discount(original_price, data.package_price)
        pkg = ServicePackage(
            tenant_id=tenant_id,
            name=data.name,
            description=data.description,
            services=services_payload,
            original_price=original_price,
            package_price=data.package_price,
            discount_amount=discount_amount,
            discount_percentage=discount_percentage,
            valid_from=data.valid_from,
            valid_until=data.valid_until,
            is_active=data.is_active,
            max_bookings_per_customer=data.max_bookings_per_customer,
            total_bookings_limit=data.total_bookings_limit,
            image_url=data.image_url,
            display_order=data.display_order,
            is_featured=data.is_featured,
            created_by=user_id,
            updated_by=user_id,
        )
        self.session.add(pkg)
        await self.session.flush()
        await self.session.refresh(pkg)
        return pkg

    async def update(
        self, tenant_id: uuid.UUID, package_id: uuid.UUID, data: ServicePackageUpdate, user_id: uuid.UUID | None
    ) -> ServicePackage | None:
        pkg = await self.get(tenant_id, package_id)
        if pkg is None:
            return None
        payload = data.model_dump(exclude_unset=True)
        if "services" in payload and payload["services"] is not None:
            resolved, original_price, _ = await self._resolve_services(tenant_id, data.services or [])
            payload["services"] = resolved
            payload["original_price"] = original_price
        package_price = payload.get("package_price", pkg.package_price)
        original_price = payload.get("original_price", pkg.original_price)
        discount_amount, discount_percentage = self._compute_discount(original_price, package_price)
        payload["discount_amount"] = discount_amount
        payload["discount_percentage"] = discount_percentage
        payload["updated_by"] = user_id
        for field, value in payload.items():
            setattr(pkg, field, value)
        await self.session.flush()
        await self.session.refresh(pkg)
        return pkg

    async def delete(self, tenant_id: uuid.UUID, package_id: uuid.UUID) -> bool:
        pkg = await self.get(tenant_id, package_id)
        if pkg is None:
            return False
        await self.session.delete(pkg)
        await self.session.flush()
        return True

    async def to_read(self, tenant_id: uuid.UUID, pkg: ServicePackage) -> ServicePackageRead:
        service_ids = [uuid.UUID(str(s["service_id"])) for s in (pkg.services or []) if s.get("service_id")]
        service_map: dict[uuid.UUID, Service] = {}
        if service_ids:
            result = await self.session.execute(
                select(Service).where(Service.tenant_id == tenant_id, Service.id.in_(service_ids))
            )
            service_map = {s.id: s for s in result.scalars().all()}
        items: list[ServicePackageItemRead] = []
        total_duration = 0
        for raw in pkg.services or []:
            sid = uuid.UUID(str(raw["service_id"]))
            qty = int(raw.get("quantity", 1))
            svc = service_map.get(sid)
            if svc:
                total_duration += svc.duration_minutes * qty
            items.append(
                ServicePackageItemRead(
                    service_id=sid,
                    quantity=qty,
                    service_name=svc.name if svc else None,
                    service_price=svc.price if svc else None,
                    service_duration_minutes=svc.duration_minutes if svc else None,
                )
            )
        now = datetime.now(timezone.utc)
        is_valid = pkg.is_active
        if pkg.valid_from and now < pkg.valid_from:
            is_valid = False
        if pkg.valid_until and now > pkg.valid_until:
            is_valid = False
        if pkg.total_bookings_limit is not None and pkg.current_bookings_count >= pkg.total_bookings_limit:
            is_valid = False
        return ServicePackageRead(
            id=pkg.id,
            tenant_id=pkg.tenant_id,
            name=pkg.name,
            description=pkg.description,
            services=items,
            original_price=pkg.original_price,
            package_price=pkg.package_price,
            discount_amount=pkg.discount_amount,
            discount_percentage=pkg.discount_percentage,
            valid_from=pkg.valid_from,
            valid_until=pkg.valid_until,
            is_active=pkg.is_active,
            max_bookings_per_customer=pkg.max_bookings_per_customer,
            total_bookings_limit=pkg.total_bookings_limit,
            current_bookings_count=pkg.current_bookings_count,
            image_url=pkg.image_url,
            display_order=pkg.display_order,
            is_featured=pkg.is_featured,
            is_valid=is_valid,
            total_duration_minutes=total_duration,
            created_at=pkg.created_at,
            updated_at=pkg.updated_at,
        )

    async def _resolve_services(
        self, tenant_id: uuid.UUID, items
    ) -> tuple[list[dict], Decimal, int]:
        ids = [uuid.UUID(str(i.service_id)) for i in items]
        unique_ids = list(dict.fromkeys(ids))
        result = await self.session.execute(
            select(Service).where(Service.tenant_id == tenant_id, Service.id.in_(unique_ids))
        )
        services = {s.id: s for s in result.scalars().all()}
        missing = [str(sid) for sid in unique_ids if sid not in services]
        if missing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid service_ids: {', '.join(missing)}",
            )
        original = Decimal("0")
        resolved: list[dict] = []
        for item in items:
            sid = uuid.UUID(str(item.service_id))
            qty = int(item.quantity)
            svc = services[sid]
            original += svc.price * qty
            resolved.append({"service_id": str(sid), "quantity": qty})
        return resolved, original, 0

    @staticmethod
    def _compute_discount(original_price: Decimal, package_price: Decimal) -> tuple[Decimal, Decimal]:
        if package_price > original_price:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Package price cannot exceed original price",
            )
        discount_amount = (original_price - package_price).quantize(Decimal("0.01"))
        discount_percentage = (
            (discount_amount / original_price * Decimal("100")).quantize(Decimal("0.01"))
            if original_price > 0
            else Decimal("0")
        )
        return discount_amount, discount_percentage
