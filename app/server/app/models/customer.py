"""Customer ORM model."""
from __future__ import annotations

from datetime import date
from decimal import Decimal

from sqlalchemy import Boolean, Date, Numeric, String
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TenantMixin, TimestampMixin, UUIDPrimaryKeyMixin


class Customer(UUIDPrimaryKeyMixin, TenantMixin, TimestampMixin, Base):
    """Customer of a tenant."""

    __tablename__ = "customers"

    first_name: Mapped[str] = mapped_column(String(100), nullable=False)
    last_name: Mapped[str] = mapped_column(String(100), nullable=False)
    email: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    phone: Mapped[str] = mapped_column(String(20), nullable=False)
    address: Mapped[str | None] = mapped_column(String(500), nullable=True)
    date_of_birth: Mapped[date | None] = mapped_column(Date, nullable=True)
    preferred_staff_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    communication_preference: Mapped[str] = mapped_column(String(16), nullable=False, default="email")
    status: Mapped[str] = mapped_column(String(16), nullable=False, default="active", index=True)
    outstanding_balance: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False, default=Decimal("0"))
    is_guest: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    notification_preferences: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
