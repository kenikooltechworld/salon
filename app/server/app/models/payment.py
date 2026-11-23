"""Payment ORM model."""
from __future__ import annotations

import uuid
from datetime import datetime
from decimal import Decimal

from sqlalchemy import DateTime, Integer, Numeric, String
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TenantMixin, TimestampMixin, UUIDPrimaryKeyMixin


class Payment(UUIDPrimaryKeyMixin, TenantMixin, TimestampMixin, Base):
    """Payment transaction."""

    __tablename__ = "payments"

    customer_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True, index=True)
    invoice_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True, index=True)

    amount: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    status: Mapped[str] = mapped_column(String(16), nullable=False, default="pending", index=True)
    reference: Mapped[str] = mapped_column(String(128), nullable=False, index=True)
    gateway: Mapped[str] = mapped_column(String(32), nullable=False, default="paystack")
    payment_method: Mapped[str] = mapped_column(String(32), nullable=False, default="paystack")

    idempotency_key: Mapped[str | None] = mapped_column(String(128), nullable=True, index=True)
    retry_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    max_retries: Mapped[int] = mapped_column(Integer, nullable=False, default=3)
    last_retry_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    next_retry_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    metadata_: Mapped[dict] = mapped_column("metadata", JSONB, nullable=False, default=dict)
