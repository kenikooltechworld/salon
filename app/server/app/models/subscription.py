"""Subscription model for tenant billing."""
from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, String
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin


class Subscription(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "subscriptions"

    tenant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, unique=True, index=True
    )
    pricing_plan_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("pricing_plans.id", ondelete="RESTRICT"), nullable=False, index=True
    )

    billing_cycle: Mapped[str] = mapped_column(String(16), nullable=False, default="monthly")
    current_period_start: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    current_period_end: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    next_billing_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    trial_end: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    is_trial: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    status: Mapped[str] = mapped_column(String(32), nullable=False, default="trial", index=True)
    subscription_status: Mapped[str] = mapped_column(String(32), nullable=False, default="trial")
    transaction_fee_percentage: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    trial_expiry_action_required: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    grace_period_end: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    is_in_grace_period: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    paystack_subscription_id: Mapped[str | None] = mapped_column(String(128), nullable=True)
    paystack_plan_id: Mapped[str | None] = mapped_column(String(128), nullable=True)
    last_payment_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    last_payment_amount: Mapped[float | None] = mapped_column(Float, nullable=True)
    failed_payment_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    auto_renew: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    renewal_reminders_sent: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict, server_default="{}")

    canceled_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
