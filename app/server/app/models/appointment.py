"""Appointment ORM model."""
from __future__ import annotations

from datetime import datetime
from decimal import Decimal

from sqlalchemy import DateTime, ForeignKey, Numeric, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TenantMixin, TimestampMixin, UUIDPrimaryKeyMixin


class Appointment(UUIDPrimaryKeyMixin, TenantMixin, TimestampMixin, Base):
    """Appointment booked for a tenant."""

    __tablename__ = "appointments"

    customer_id: Mapped[str | None] = mapped_column(String(64), nullable=True, index=True)
    staff_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    service_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    location_id: Mapped[str | None] = mapped_column(String(64), nullable=True)

    start_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, index=True)
    end_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    status: Mapped[str] = mapped_column(String(16), nullable=False, default="scheduled", index=True)
    cancellation_reason: Mapped[str | None] = mapped_column(String(500), nullable=True)
    cancelled_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    cancelled_by: Mapped[str | None] = mapped_column(String(64), nullable=True)
    no_show_reason: Mapped[str | None] = mapped_column(String(500), nullable=True)

    notes: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    price: Mapped[Decimal | None] = mapped_column(Numeric(10, 2), nullable=True)
    payment_id: Mapped[str | None] = mapped_column(String(64), nullable=True)

    confirmed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    is_guest: Mapped[bool] = mapped_column(default=False, nullable=False)
    guest_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    guest_email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    guest_phone: Mapped[str | None] = mapped_column(String(20), nullable=True)

    idempotency_key: Mapped[str | None] = mapped_column(String(128), nullable=True, unique=True)
    payment_option: Mapped[str | None] = mapped_column(String(16), nullable=True)
    payment_status: Mapped[str | None] = mapped_column(String(16), nullable=True)

    addons_total: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False, default=Decimal("0"))

    reminder_24h_sent: Mapped[bool] = mapped_column(default=False, nullable=False)
    reminder_1h_sent: Mapped[bool] = mapped_column(default=False, nullable=False)

    ip_address: Mapped[str | None] = mapped_column(String(64), nullable=True)
    user_agent: Mapped[str | None] = mapped_column(String(500), nullable=True)
