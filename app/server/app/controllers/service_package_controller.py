"""Service package controller."""
from __future__ import annotations

import uuid

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.schemas.notification import NotificationCreate
from app.schemas.service_package import (
    ServicePackageCreate,
    ServicePackageListResponse,
    ServicePackageRead,
    ServicePackageUpdate,
)
from app.services.notification_service import NotificationService
from app.services.service_package_service import ServicePackageService


class ServicePackageController:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.service = ServicePackageService(session)
        self.notifications = NotificationService(session)

    async def list(
        self,
        tenant_id: uuid.UUID,
        *,
        is_active: bool | None = None,
        is_featured: bool | None = None,
        include_expired: bool = False,
        page: int = 1,
        page_size: int = 20,
    ) -> ServicePackageListResponse:
        items, total = await self.service.list_packages(
            tenant_id,
            is_active=is_active,
            is_featured=is_featured,
            include_expired=include_expired,
            page=page,
            page_size=page_size,
        )
        packages = [await self.service.to_read(tenant_id, i) for i in items]
        return ServicePackageListResponse(packages=packages, total=total, page=page, page_size=page_size)

    async def create(self, tenant_id: uuid.UUID, data: ServicePackageCreate, user_id: uuid.UUID | None) -> ServicePackageRead:
        item = await self.service.create(tenant_id, data, user_id)
        await self.session.flush()
        actor_id = user_id or item.created_by
        if actor_id:
            await self.notifications.create(tenant_id, NotificationCreate(recipient_id=actor_id, notification_type="service_package.created", title="Service package created", content=f'Package "{item.name}" was created.', data={"package_id": str(item.id)}))
        else:
            await self.session.commit()
        return await self.service.to_read(tenant_id, item)

    async def get(self, tenant_id: uuid.UUID, package_id: uuid.UUID) -> ServicePackageRead:
        item = await self.service.get(tenant_id, package_id)
        if item is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Package not found")
        return await self.service.to_read(tenant_id, item)

    async def update(
        self, tenant_id: uuid.UUID, package_id: uuid.UUID, data: ServicePackageUpdate, user_id: uuid.UUID | None
    ) -> ServicePackageRead:
        item = await self.service.update(tenant_id, package_id, data, user_id)
        if item is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Package not found")
        await self.session.flush()
        actor_id = user_id or item.updated_by
        if actor_id:
            await self.notifications.create(tenant_id, NotificationCreate(recipient_id=actor_id, notification_type="service_package.updated", title="Service package updated", content=f'Package "{item.name}" was updated.', data={"package_id": str(item.id)}))
        else:
            await self.session.commit()
        await self.session.refresh(item)
        return await self.service.to_read(tenant_id, item)

    async def delete(self, tenant_id: uuid.UUID, package_id: uuid.UUID, actor_id: uuid.UUID | None = None) -> None:
        item = await self.service.get(tenant_id, package_id)
        if item is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Package not found")
        name = item.name
        ok = await self.service.delete(tenant_id, package_id)
        if not ok:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Package not found")
        await self.session.flush()
        if actor_id:
            await self.notifications.create(tenant_id, NotificationCreate(recipient_id=actor_id, notification_type="service_package.deleted", title="Service package deleted", content=f'Package "{name}" was deleted.', data={"package_id": str(package_id)}))
        else:
            await self.session.commit()
