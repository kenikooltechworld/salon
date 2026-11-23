"""Public booking schemas."""
from __future__ import annotations

import uuid
from datetime import date, datetime

from pydantic import BaseModel, EmailStr, Field


class PublicServiceRead(BaseModel):
    id: uuid.UUID
    name: str
    description: str | None = None
    duration_minutes: int
    price: float
    is_published: bool
    public_description: str | None = None
    public_image_url: str | None = None
    allow_public_booking: bool
    benefits: list[str] = Field(default_factory=list)


class PublicStaffRead(BaseModel):
    id: uuid.UUID
    first_name: str
    last_name: str
    is_available_for_public_booking: bool = False
    bio: str | None = None
    profile_image_url: str | None = None
    specialties: list[str] = Field(default_factory=list)
    rating: float | None = None
    review_count: int = 0


class AvailabilitySlotRead(BaseModel):
    time: str
    available: bool


class AvailabilityResponse(BaseModel):
    date: date
    slots: list[AvailabilitySlotRead]


class PublicBookingCreate(BaseModel):
    service_id: uuid.UUID
    staff_id: uuid.UUID
    booking_date: date
    booking_time: str = Field(pattern=r"^([01]\d|2[0-3]):[0-5]\d$")
    duration_minutes: int | None = Field(default=None, ge=15, le=480)
    customer_name: str = Field(min_length=1, max_length=255)
    customer_email: EmailStr
    customer_phone: str = Field(min_length=3, max_length=32)
    notes: str | None = Field(default=None, max_length=1000)
    payment_option: str | None = Field(default="later", pattern=r"^(now|later)$")


class PublicBookingRead(BaseModel):
    id: uuid.UUID
    tenant_id: uuid.UUID
    service_id: uuid.UUID
    staff_id: uuid.UUID
    appointment_id: uuid.UUID | None = None
    customer_name: str | None = None
    customer_email: str | None = None
    customer_phone: str | None = None
    booking_date: date
    booking_time: str
    duration_minutes: int
    status: str
    notes: str | None = None
    payment_option: str | None = None
    payment_status: str | None = None
    created_at: datetime
    updated_at: datetime


class TestimonialRead(BaseModel):
    customer_name: str
    rating: int
    review: str
    created_at: str


class StatisticsRead(BaseModel):
    total_bookings: int
    average_rating: float
    average_response_time: int


class ReviewCreate(BaseModel):
    booking_id: uuid.UUID
    rating: int = Field(ge=1, le=5)
    feedback: str | None = Field(default=None, max_length=1000)


class ReviewRead(BaseModel):
    success: bool
    message: str
