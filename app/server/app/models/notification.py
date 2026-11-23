"""Notification ORM model."""
from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TenantMixin, TimestampMixin, UUIDPrimaryKeyMixin


class Notification(UUIDPrimaryKeyMixin, TenantMixin, TimestampMixin, Base):
    __tablename__ = "notifications"

    recipient_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False, index=True)
    recipient_type: Mapped[str] = mapped_column(String(32), nullable=False, default="user")
    notification_type: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    channel: Mapped[str] = mapped_column(String(16), nullable=False, default="in_app")
    status: Mapped[str] = mapped_column(String(16), nullable=False, default="pending", index=True)

    title: Mapped[str | None] = mapped_column(String(255), nullable=True)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    data: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)

    is_read: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, index=True)
    read_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    sent_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
