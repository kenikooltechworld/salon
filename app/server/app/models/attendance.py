"""Attendance model."""
from __future__ import annotations

from datetime import datetime

from sqlalchemy import Boolean, DateTime, Float, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TenantMixin, TimestampMixin, UUIDPrimaryKeyMixin


class AttendanceRecord(UUIDPrimaryKeyMixin, TenantMixin, TimestampMixin, Base):
    __tablename__ = "attendance_records"

    staff_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    shift_id: Mapped[str | None] = mapped_column(String(64), nullable=True, index=True)
    check_in_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    check_out_time: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    date: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, index=True)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="checked_in", index=True)
    hours_worked: Mapped[float | None] = mapped_column(Float, nullable=True, default=0.0)
    break_minutes: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    is_late: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    is_early_departure: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    verified_by: Mapped[str | None] = mapped_column(String(64), nullable=True)
