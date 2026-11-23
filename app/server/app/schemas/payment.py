"""Schemas for payments."""
from __future__ import annotations

import uuid
from datetime import datetime
from decimal import Decimal
from typing import Literal, Optional

from pydantic import BaseModel, Field

PaymentStatus = Literal["pending", "success", "failed", "cancelled"]
PaymentMethod = Literal["paystack", "cash", "card", "mobile_money", "check", "bank_transfer"]


class PaymentCreate(BaseModel):
    customer_id: Optional[uuid.UUID] = None
    invoice_id: Optional[uuid.UUID] = None
    amount: Decimal = Field(ge=0)
    status: PaymentStatus = "pending"
    reference: str = Field(min_length=1, max_length=128)
    gateway: str = Field(default="paystack", max_length=32)
    payment_method: PaymentMethod = "paystack"
    idempotency_key: Optional[str] = Field(default=None, max_length=128)
    metadata: dict = Field(default_factory=dict)


class PaymentUpdate(BaseModel):
    status: Optional[PaymentStatus] = None
    retry_count: Optional[int] = Field(default=None, ge=0)
    last_retry_at: Optional[datetime] = None
    next_retry_at: Optional[datetime] = None
    metadata: Optional[dict] = None


class PaymentRead(BaseModel):
    id: uuid.UUID
    tenant_id: uuid.UUID
    customer_id: Optional[uuid.UUID] = None
    invoice_id: Optional[uuid.UUID] = None
    amount: Decimal
    status: str
    reference: str
    gateway: str
    payment_method: str
    idempotency_key: Optional[str] = None
    retry_count: int
    max_retries: int
    last_retry_at: Optional[datetime] = None
    next_retry_at: Optional[datetime] = None
    metadata: dict = Field(default_factory=dict)
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class PaymentListResponse(BaseModel):
    payments: list[PaymentRead]
    total: int
    page: int
    page_size: int
