"""Notification schemas."""
from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


class NotificationCreate(BaseModel):
    recipient_id: uuid.UUID
    recipient_type: str = Field(default="user", max_length=32)
    notification_type: str = Field(min_length=1, max_length=64)
    channel: str = Field(default="in_app", max_length=16)
    title: str | None = Field(default=None, max_length=255)
    content: str = Field(min_length=1)
    data: dict[str, Any] = Field(default_factory=dict)


class NotificationRead(BaseModel):
    id: uuid.UUID
    tenant_id: uuid.UUID
    recipient_id: uuid.UUID
    recipient_type: str
    notification_type: str
    channel: str
    status: str
    title: str | None = None
    content: str
    data: dict[str, Any] = Field(default_factory=dict)
    is_read: bool
    read_at: datetime | None = None
    sent_at: datetime | None = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class NotificationListResponse(BaseModel):
    notifications: list[NotificationRead]
    total: int
    unread_count: int
    page: int
    page_size: int
