"""Availability model for staff schedules."""
from __future__ import annotations

from datetime import date

from sqlalchemy import Boolean, Date, Integer, String
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TenantMixin, TimestampMixin, UUIDPrimaryKeyMixin


class Availability(UUIDPrimaryKeyMixin, TenantMixin, TimestampMixin, Base):
    __tablename__ = "availability"

    staff_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    day_of_week: Mapped[int | None] = mapped_column(Integer, nullable=True)  # 0=Mon..6=Sun
    start_time: Mapped[str] = mapped_column(String(8), nullable=False)  # HH:MM:SS
    end_time: Mapped[str] = mapped_column(String(8), nullable=False)
    is_recurring: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    effective_from: Mapped[date] = mapped_column(Date, nullable=False)
    effective_to: Mapped[date | None] = mapped_column(Date, nullable=True)
    breaks: Mapped[list[dict]] = mapped_column(JSONB, nullable=False, default=list, server_default="[]")
    slot_interval_minutes: Mapped[int] = mapped_column(Integer, default=30, nullable=False)
    buffer_time_minutes: Mapped[int] = mapped_column(Integer, default=15, nullable=False)
    concurrent_bookings_allowed: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    notes: Mapped[str | None] = mapped_column(String(500), nullable=True)
