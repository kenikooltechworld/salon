"""Session model for server-side auth sessions."""
from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TenantMixin, TimestampMixin, UUIDPrimaryKeyMixin


class Session(UUIDPrimaryKeyMixin, TenantMixin, TimestampMixin, Base):
    __tablename__ = "sessions"

    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    token_hash: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    refresh_token_hash: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    csrf_token_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, index=True)
    ip_address: Mapped[str | None] = mapped_column(String(64), nullable=True)
    user_agent: Mapped[str | None] = mapped_column(String(512), nullable=True)
    browser_fingerprint: Mapped[str | None] = mapped_column(String(64), nullable=True, index=True)
    status: Mapped[str] = mapped_column(String(16), nullable=False, default="active", index=True)
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
