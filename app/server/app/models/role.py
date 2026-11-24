"""Role model."""
from __future__ import annotations

from sqlalchemy import Boolean, String
from sqlalchemy.dialects.postgresql import ARRAY
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TenantMixin, TimestampMixin, UUIDPrimaryKeyMixin


class Role(UUIDPrimaryKeyMixin, TenantMixin, TimestampMixin, Base):
    __tablename__ = "roles"

    name: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    description: Mapped[str | None] = mapped_column(String(500), nullable=True)
    is_custom: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    permissions: Mapped[list[str] | None] = mapped_column(ARRAY(String(255)), nullable=True, default=list)
