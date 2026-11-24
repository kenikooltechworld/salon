"""Goal models."""
from __future__ import annotations

from datetime import datetime

from sqlalchemy import Boolean, DateTime, Float, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TenantMixin, TimestampMixin, UUIDPrimaryKeyMixin


class Goal(UUIDPrimaryKeyMixin, TenantMixin, TimestampMixin, Base):
    __tablename__ = "goals"

    staff_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    goal_type: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    target_value: Mapped[float] = mapped_column(Float, nullable=False)
    current_value: Mapped[float] = mapped_column(Float, nullable=False, default=0)
    period_start: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    period_end: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="active", index=True)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)


class GoalAchievement(UUIDPrimaryKeyMixin, TenantMixin, TimestampMixin, Base):
    __tablename__ = "goal_achievements"

    goal_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    staff_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    achieved_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    target_value: Mapped[float] = mapped_column(Float, nullable=False)
    achieved_value: Mapped[float] = mapped_column(Float, nullable=False)
    bonus_earned: Mapped[float | None] = mapped_column(Float, nullable=True, default=0.0)
    incentive_details: Mapped[str | None] = mapped_column(Text, nullable=True)
