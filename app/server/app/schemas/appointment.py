"""Schemas for appointments."""
from __future__ import annotations

import uuid
from datetime import datetime
from decimal import Decimal
from typing import Literal, Optional
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from pydantic import BaseModel, EmailStr, Field, model_validator

AppointmentStatus = Literal["scheduled", "confirmed", "in_progress", "completed", "cancelled", "no_show"]
PaymentStatus = Literal["pending", "paid", "failed", "refunded", "completed"]
AppointmentPaymentMethod = Literal["paystack", "cash", "card", "mobile_money", "check", "bank_transfer"]


class AppointmentCreate(BaseModel):
    model_config = {"extra": "forbid"}

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
    guest_email: Optional[EmailStr] = None
    guest_phone: Optional[str] = Field(default=None, max_length=20)
    payment_option: Optional[Literal["now", "later"]] = None
    payment_status: Optional[PaymentStatus] = None
    time_zone: str = Field(default="UTC", min_length=1, max_length=64)
    idempotency_key: Optional[str] = Field(default=None, max_length=128)

    @model_validator(mode="after")
    def validate_booking(self):
        if self.start_time.tzinfo is None or self.end_time.tzinfo is None:
            raise ValueError("Booking times must include a timezone")
        if self.end_time <= self.start_time:
            raise ValueError("end_time must be after start_time")
        try:
            ZoneInfo(self.time_zone)
        except ZoneInfoNotFoundError as exc:
            raise ValueError("time_zone must be a valid IANA timezone") from exc
        if self.is_guest:
            if not (self.guest_name and self.guest_name.strip()):
                raise ValueError("guest_name is required for guest bookings")
        elif not self.customer_id:
            raise ValueError("customer_id is required unless this is a guest booking")
        if self.payment_status not in (None, "pending"):
            raise ValueError("Payment status must remain pending until payment is collected")
        return self


class AppointmentUpdate(BaseModel):
    model_config = {"extra": "forbid"}

    status: Optional[AppointmentStatus] = None
    staff_id: Optional[str] = Field(default=None, min_length=1, max_length=64)
    service_id: Optional[str] = Field(default=None, min_length=1, max_length=64)
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    time_zone: Optional[str] = Field(default=None, min_length=1, max_length=64)
    notes: Optional[str] = Field(default=None, max_length=1000)
    cancellation_reason: Optional[str] = Field(default=None, max_length=500)
    no_show_reason: Optional[str] = Field(default=None, max_length=500)
    price: Optional[Decimal] = Field(default=None, ge=0)

    @model_validator(mode="after")
    def validate_times(self):
        if not self.model_fields_set:
            raise ValueError("At least one field must be provided")
        for field in ("status", "staff_id", "service_id", "start_time", "end_time"):
            if field in self.model_fields_set and getattr(self, field) is None:
                raise ValueError(f"{field} cannot be null")
        if self.start_time is not None and self.start_time.tzinfo is None:
            raise ValueError("start_time must include a timezone")
        if self.end_time is not None and self.end_time.tzinfo is None:
            raise ValueError("end_time must include a timezone")
        if (self.start_time is None) != (self.end_time is None):
            raise ValueError("start_time and end_time must be updated together")
        if self.time_zone is not None:
            try:
                ZoneInfo(self.time_zone)
            except ZoneInfoNotFoundError as exc:
                raise ValueError("time_zone must be a valid IANA timezone") from exc
        if self.start_time is not None and self.end_time is not None and self.end_time <= self.start_time:
            raise ValueError("end_time must be after start_time")
        return self


class AppointmentAction(BaseModel):
    model_config = {"extra": "forbid"}

    reason: Optional[str] = Field(default=None, max_length=500)


class AppointmentCollectPaymentRequest(BaseModel):
    model_config = {"extra": "forbid"}

    payment_method: AppointmentPaymentMethod
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
