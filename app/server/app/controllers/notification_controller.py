"""Notification controller."""
from __future__ import annotations

import uuid

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.schemas.notification import NotificationListResponse, NotificationRead
from app.services.notification_service import NotificationService


class NotificationController:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.service = NotificationService(session)

    async def list(
        self,
        tenant_id: uuid.UUID,
        recipient_id: uuid.UUID,
        *,
        is_read: bool | None,
        category: str | None = None,
        page: int,
        page_size: int,
    ) -> NotificationListResponse:
        rows, total, unread = await self.service.list_for_user(
            tenant_id, recipient_id, is_read=is_read, category=category, page=page, page_size=page_size
        )
        return NotificationListResponse(
            notifications=[NotificationRead.model_validate(r) for r in rows],
            total=total,
            unread_count=unread,
            page=page,
            page_size=page_size,
        )

    async def get(self, tenant_id: uuid.UUID, notification_id: uuid.UUID, recipient_id: uuid.UUID) -> NotificationRead:
        row = await self.service.get(tenant_id, notification_id, recipient_id)
        if row is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found")
        return NotificationRead.model_validate(row)

    async def mark_read(self, tenant_id: uuid.UUID, notification_id: uuid.UUID, recipient_id: uuid.UUID) -> NotificationRead:
        row = await self.service.mark_read(tenant_id, notification_id, recipient_id)
        if row is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found")
        await self.session.commit()
        await self.session.refresh(row)
        return NotificationRead.model_validate(row)

    async def mark_all_read(self, tenant_id: uuid.UUID, recipient_id: uuid.UUID) -> dict:
        count = await self.service.mark_all_read(tenant_id, recipient_id)
        await self.session.commit()
        return {"updated_count": count}
