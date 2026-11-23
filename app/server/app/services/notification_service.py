"""Notification service."""
from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Sequence

from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.lib.socketio import emit_to_user
from app.models.notification import Notification
from app.schemas.notification import NotificationCreate


class NotificationService:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def create(self, tenant_id: uuid.UUID, data: NotificationCreate, *, emit: bool = True) -> Notification:
        row = Notification(
            tenant_id=tenant_id,
            recipient_id=data.recipient_id,
            recipient_type=data.recipient_type,
            notification_type=data.notification_type,
            channel=data.channel,
            status="sent" if data.channel == "in_app" else "pending",
            title=data.title,
            content=data.content,
            data=data.data or {},
            sent_at=datetime.now(timezone.utc) if data.channel == "in_app" else None,
        )
        self.session.add(row)
        await self.session.flush()
        await self.session.refresh(row)
        if emit and data.channel == "in_app":
            await self._emit(row)
        return row

    async def create_for_users(
        self,
        tenant_id: uuid.UUID,
        recipient_ids: Sequence[uuid.UUID],
        *,
        notification_type: str,
        title: str | None,
        content: str,
        data: dict | None = None,
        recipient_type: str = "user",
    ) -> list[Notification]:
        rows: list[Notification] = []
        for rid in dict.fromkeys(recipient_ids):
            rows.append(
                await self.create(
                    tenant_id,
                    NotificationCreate(
                        recipient_id=rid,
                        recipient_type=recipient_type,
                        notification_type=notification_type,
                        channel="in_app",
                        title=title,
                        content=content,
                        data=data or {},
                    ),
                    emit=True,
                )
            )
        return rows

    async def list_for_user(
        self,
        tenant_id: uuid.UUID,
        recipient_id: uuid.UUID,
        *,
        is_read: bool | None = None,
        page: int = 1,
        page_size: int = 20,
    ) -> tuple[Sequence[Notification], int, int]:
        base = select(Notification).where(
            Notification.tenant_id == tenant_id, Notification.recipient_id == recipient_id
        )
        count_base = select(func.count()).select_from(Notification).where(
            Notification.tenant_id == tenant_id, Notification.recipient_id == recipient_id
        )
        if is_read is not None:
            base = base.where(Notification.is_read.is_(is_read))
            count_base = count_base.where(Notification.is_read.is_(is_read))
        total = (await self.session.execute(count_base)).scalar_one()
        unread = (
            await self.session.execute(
                select(func.count()).select_from(Notification).where(
                    Notification.tenant_id == tenant_id,
                    Notification.recipient_id == recipient_id,
                    Notification.is_read.is_(False),
                )
            )
        ).scalar_one()
        rows = (
            await self.session.execute(
                base.order_by(Notification.created_at.desc()).offset((page - 1) * page_size).limit(page_size)
            )
        ).scalars().all()
        return rows, total, unread

    async def get(self, tenant_id: uuid.UUID, notification_id: uuid.UUID, recipient_id: uuid.UUID) -> Notification | None:
        return (
            await self.session.execute(
                select(Notification).where(
                    Notification.id == notification_id,
                    Notification.tenant_id == tenant_id,
                    Notification.recipient_id == recipient_id,
                )
            )
        ).scalar_one_or_none()

    async def mark_read(self, tenant_id: uuid.UUID, notification_id: uuid.UUID, recipient_id: uuid.UUID) -> Notification | None:
        row = await self.get(tenant_id, notification_id, recipient_id)
        if row is None:
            return None
        if not row.is_read:
            row.is_read = True
            row.read_at = datetime.now(timezone.utc)
            await self.session.flush()
            await self.session.refresh(row)
        return row

    async def mark_all_read(self, tenant_id: uuid.UUID, recipient_id: uuid.UUID) -> int:
        result = await self.session.execute(
            update(Notification)
            .where(
                Notification.tenant_id == tenant_id,
                Notification.recipient_id == recipient_id,
                Notification.is_read.is_(False),
            )
            .values(is_read=True, read_at=datetime.now(timezone.utc))
        )
        await self.session.flush()
        return result.rowcount or 0

    async def _emit(self, row: Notification) -> None:
        try:
            await emit_to_user(
                str(row.tenant_id),
                str(row.recipient_id),
                "notification:new",
                {
                    "id": str(row.id),
                    "notification_type": row.notification_type,
                    "title": row.title,
                    "content": row.content,
                    "data": row.data,
                    "is_read": row.is_read,
                    "created_at": row.created_at.isoformat() if row.created_at else None,
                },
            )
        except Exception:
            # Realtime delivery should not fail the main action.
            return
