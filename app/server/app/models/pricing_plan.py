"""Pricing plan model for subscription tiers."""
from __future__ import annotations

from sqlalchemy import Boolean, Float, Integer, String
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin


class PricingPlan(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "pricing_plans"

    name: Mapped[str] = mapped_column(String(50), nullable=False, unique=True)
    tier_level: Mapped[int] = mapped_column(Integer, nullable=False, unique=True, index=True)
    description: Mapped[str | None] = mapped_column(String(500), nullable=True)

    monthly_price: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    yearly_price: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    currency: Mapped[str] = mapped_column(String(8), nullable=False, default="NGN")

    features: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict, server_default="{}")
    trial_days: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    is_trial_plan: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True, index=True)
    is_featured: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    paystack_plan_code: Mapped[str | None] = mapped_column(String(128), nullable=True)
