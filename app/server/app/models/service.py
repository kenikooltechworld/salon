"""Service ORM model."""
from __future__ import annotations

from decimal import Decimal

from sqlalchemy import Boolean, Integer, Numeric, String
from sqlalchemy.dialects.postgresql import ARRAY
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TenantMixin, TimestampMixin, UUIDPrimaryKeyMixin


class Service(UUIDPrimaryKeyMixin, TenantMixin, TimestampMixin, Base):
    """Service offered by a tenant."""

    __tablename__ = "services"

    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    duration_minutes: Mapped[int] = mapped_column(Integer, nullable=False)
    price: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    category: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    color: Mapped[str | None] = mapped_column(String(7), nullable=True, default="#3B82F6")
    icon: Mapped[str | None] = mapped_column(String(50), nullable=True, default="Scissors")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    is_published: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    public_description: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    public_image_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    allow_public_booking: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    allow_pay_now: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    tags: Mapped[list[str] | None] = mapped_column(ARRAY(String(50)), nullable=True, default=list)
    benefits: Mapped[list[str] | None] = mapped_column(ARRAY(String(200)), nullable=True, default=list)
    commission_percentage: Mapped[Decimal | None] = mapped_column(Numeric(5, 2), nullable=True)
