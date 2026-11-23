"""Customer preference ORM model."""
from __future__ import annotations

from sqlalchemy import String
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TenantMixin, TimestampMixin, UUIDPrimaryKeyMixin


class CustomerPreference(UUIDPrimaryKeyMixin, TenantMixin, TimestampMixin, Base):
    __tablename__ = "customer_preferences"

    customer_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    preferred_staff_ids: Mapped[list | None] = mapped_column(JSONB, nullable=True, default=list)
    preferred_service_ids: Mapped[list | None] = mapped_column(JSONB, nullable=True, default=list)
    communication_methods: Mapped[list | None] = mapped_column(JSONB, nullable=True, default=list)
    preferred_time_slots: Mapped[list | None] = mapped_column(JSONB, nullable=True, default=list)
    language: Mapped[str] = mapped_column(String(10), nullable=False, default="en")
    notes: Mapped[str | None] = mapped_column(String(1000), nullable=True)
