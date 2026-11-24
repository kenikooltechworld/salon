"""Staff ORM model."""
from __future__ import annotations

from datetime import date
from decimal import Decimal

from sqlalchemy import Boolean, Date, Integer, Numeric, String
from sqlalchemy.dialects.postgresql import ARRAY
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TenantMixin, TimestampMixin, UUIDPrimaryKeyMixin


class Staff(UUIDPrimaryKeyMixin, TenantMixin, TimestampMixin, Base):
    """Staff member of a tenant."""

    __tablename__ = "staff"

    user_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    specialties: Mapped[list[str] | None] = mapped_column(ARRAY(String(100)), nullable=True, default=list)
    certifications: Mapped[list[str] | None] = mapped_column(ARRAY(String(255)), nullable=True, default=list)
    certification_files: Mapped[list[str] | None] = mapped_column(ARRAY(String(500)), nullable=True, default=list)
    payment_type: Mapped[str] = mapped_column(String(16), nullable=False, default="hourly")
    payment_rate: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False, default=Decimal("0"))
    hire_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    bio: Mapped[str | None] = mapped_column(String(500), nullable=True)
    profile_image_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    status: Mapped[str] = mapped_column(String(16), nullable=False, default="active", index=True)
    is_available_for_public_booking: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    service_ids: Mapped[list[str] | None] = mapped_column(ARRAY(String(64)), nullable=True, default=list)
    rating: Mapped[Decimal | None] = mapped_column(Numeric(3, 2), nullable=True)
    review_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
