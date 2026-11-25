"""Service controller."""
from __future__ import annotations

import uuid

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.schemas.notification import NotificationCreate
from app.schemas.service import ServiceCreate, ServiceListResponse, ServiceRead, ServiceUpdate
from app.services.notification_service import NotificationService
from app.services.service_service import ServiceService


class ServiceController:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.service = ServiceService(session)
        self.notifications = NotificationService(session)

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

    async def _notify_staff(self, tenant_id: uuid.UUID, staff_ids: list[uuid.UUID], *, notification_type: str, title: str, content: str, data: dict) -> None:
        if not staff_ids:
            return
        from sqlalchemy import select
        from app.models.staff import Staff
        result = await self.session.execute(select(Staff.user_id).where(Staff.tenant_id == tenant_id, Staff.id.in_(staff_ids)))
        user_ids = []
        for uid in result.scalars().all():
            try:
                user_ids.append(uuid.UUID(str(uid)))
            except Exception:
                continue
        if user_ids:
            await self.notifications.create_for_users(tenant_id, user_ids, notification_type=notification_type, title=title, content=content, data=data)

    async def create(self, tenant_id: uuid.UUID, actor_id: uuid.UUID, data: ServiceCreate) -> ServiceRead:
        item = await self.service.create(tenant_id, data)
        await self.session.flush()
        await self.notifications.create(
            tenant_id,
            NotificationCreate(
                recipient_id=actor_id,
                notification_type="service.created",
                title="Service created",
                content=f'Service "{item.name}" was created.',
                data={"service_id": str(item.id)},
            ),
        )
        await self._notify_staff(tenant_id, list(item.staff_ids or []), notification_type="service.assigned", title="Service assigned", content=f'You were assigned to service "{item.name}".', data={"service_id": str(item.id)})
        return ServiceRead.model_validate(item)

    async def get(self, tenant_id: uuid.UUID, service_id: uuid.UUID) -> ServiceRead:
        item = await self.service.get(tenant_id, service_id)
        if item is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Service not found")
        return ServiceRead.model_validate(item)

    async def update(
        self, tenant_id: uuid.UUID, actor_id: uuid.UUID, service_id: uuid.UUID, data: ServiceUpdate
    ) -> ServiceRead:
        item = await self.service.update(tenant_id, service_id, data)
        if item is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Service not found")
        await self.session.flush()
        await self.notifications.create(
            tenant_id,
            NotificationCreate(
                recipient_id=actor_id,
                notification_type="service.updated",
                title="Service updated",
                content=f'Service "{item.name}" was updated.',
                data={"service_id": str(item.id)},
            ),
        )
        await self._notify_staff(tenant_id, list(item.staff_ids or []), notification_type="service.updated", title="Service updated", content=f'Service "{item.name}" was updated.', data={"service_id": str(item.id)})
        return ServiceRead.model_validate(item)

    async def delete(self, tenant_id: uuid.UUID, actor_id: uuid.UUID, service_id: uuid.UUID) -> dict:
        item = await self.service.get(tenant_id, service_id)
        if item is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Service not found")
        read = ServiceRead.model_validate(item).model_dump()
        result = await self.service.delete(tenant_id, service_id)
        if result is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Service not found")
        await self.session.flush()
        action = result.get("action")
        await self.notifications.create(
            tenant_id,
            NotificationCreate(
                recipient_id=actor_id,
                notification_type="service.deleted" if action == "deleted" else "service.deactivated",
                title="Service deleted" if action == "deleted" else "Service deactivated",
                content=f'Service "{item.name}" was {"permanently deleted" if action == "deleted" else "deactivated because it has related records"}.',
                data={"service_id": str(item.id), **result},
            ),
        )
        await self.session.commit()
        if action == "deactivated":
            await self.session.refresh(item)
            read = ServiceRead.model_validate(item).model_dump()
        return {"message": "Service permanently deleted" if action == "deleted" else "Service has related records and was deactivated to preserve history", **result, "service": read}
