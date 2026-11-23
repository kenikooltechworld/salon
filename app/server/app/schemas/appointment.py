"""Schemas for appointments."""
from __future__ import annotations

import uuid
from datetime import datetime
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel, Field


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
    idempotency_key: Optional[str] = Field(default=None, max_length=128)


class AppointmentUpdate(BaseModel):
    status: Optional[str] = Field(default=None, max_length=16)
    notes: Optional[str] = Field(default=None, max_length=1000)
    cancellation_reason: Optional[str] = Field(default=None, max_length=500)
    no_show_reason: Optional[str] = Field(default=None, max_length=500)
    price: Optional[Decimal] = Field(default=None, ge=0)
    payment_status: Optional[str] = Field(default=None, max_length=16)
    cancelled_at: Optional[datetime] = None
    cancelled_by: Optional[str] = Field(default=None, max_length=64)


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
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
