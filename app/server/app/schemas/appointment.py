"""Schemas for appointments."""
from __future__ import annotations

import uuid
from datetime import datetime
from decimal import Decimal
from typing import Literal, Optional

from pydantic import BaseModel, Field

AppointmentStatus = Literal["scheduled", "confirmed", "in_progress", "completed", "cancelled", "no_show"]
PaymentStatus = Literal["pending", "paid", "failed", "refunded", "completed"]


class AppointmentCreate(BaseModel):
    staff_id: str = Field(min_length=1, max_length=64)
    service_id: str = Field(min_length=1, max_length=64)
    customer_id: Optional[str] = Field(default=None, max_length=64)
    location_id: Optional[str] = Field(default=None, max_length=64)
    start_time: datetime
    end_time: datetime
    notes: Optional[str] = Field(default=None, max_length=1000)
    price: Optional[Decimal] = Field(default=None, ge=0)
    is_guest: bool = False
    guest_name: Optional[str] = Field(default=None, max_length=255)
    guest_email: Optional[str] = Field(default=None, max_length=255)
    guest_phone: Optional[str] = Field(default=None, max_length=20)
    payment_option: Optional[str] = Field(default=None, max_length=16)
    payment_status: Optional[PaymentStatus] = None
    idempotency_key: Optional[str] = Field(default=None, max_length=128)


class AppointmentUpdate(BaseModel):
    status: Optional[AppointmentStatus] = None
    notes: Optional[str] = Field(default=None, max_length=1000)
    cancellation_reason: Optional[str] = Field(default=None, max_length=500)
    no_show_reason: Optional[str] = Field(default=None, max_length=500)
    price: Optional[Decimal] = Field(default=None, ge=0)
    payment_status: Optional[PaymentStatus] = None
    cancelled_at: Optional[datetime] = None
    cancelled_by: Optional[str] = Field(default=None, max_length=64)


class AppointmentAction(BaseModel):
    reason: Optional[str] = Field(default=None, max_length=500)


class AppointmentCollectPaymentRequest(BaseModel):
    payment_method: str = Field(min_length=1, max_length=32)
    amount: Decimal = Field(gt=0)
    notes: Optional[str] = Field(default=None, max_length=1000)


class AppointmentRead(BaseModel):
    id: uuid.UUID
    tenant_id: uuid.UUID
    customer_id: Optional[str] = None
    staff_id: str
    service_id: str
    location_id: Optional[str] = None
    start_time: datetime
    end_time: datetime
    status: str
    notes: Optional[str] = None
    price: Optional[Decimal] = None
    is_guest: bool
    guest_name: Optional[str] = None
    guest_email: Optional[str] = None
    guest_phone: Optional[str] = None
    payment_option: Optional[str] = None
    payment_status: Optional[str] = None
    cancellation_reason: Optional[str] = None
    no_show_reason: Optional[str] = None
    cancelled_at: Optional[datetime] = None
    cancelled_by: Optional[str] = None
    confirmed_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class AppointmentDetailRead(AppointmentRead):
    customer: Optional[dict] = None
    service: Optional[dict] = None
    staff: Optional[dict] = None


class AppointmentListResponse(BaseModel):
    appointments: list[AppointmentRead]
    total: int
    page: int = 1
    page_size: int = 50
