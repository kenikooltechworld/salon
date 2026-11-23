"""Schemas for staff."""
from __future__ import annotations

import uuid
from datetime import date, datetime
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel, Field


class StaffCreate(BaseModel):
    user_id: str = Field(min_length=1, max_length=64)
    specialties: list[str] = Field(default_factory=list)
    certifications: list[str] = Field(default_factory=list)
    payment_type: str = Field(default="hourly", max_length=16)
    payment_rate: Decimal = Field(default=Decimal("0"), ge=0)
    hire_date: Optional[date] = None
    bio: Optional[str] = Field(default=None, max_length=500)
    profile_image_url: Optional[str] = Field(default=None, max_length=500)
    is_available_for_public_booking: bool = False
    service_ids: list[str] = Field(default_factory=list)


class StaffUpdate(BaseModel):
    specialties: Optional[list[str]] = None
    certifications: Optional[list[str]] = None
    payment_type: Optional[str] = Field(default=None, max_length=16)
    payment_rate: Optional[Decimal] = Field(default=None, ge=0)
    hire_date: Optional[date] = None
    bio: Optional[str] = Field(default=None, max_length=500)
    profile_image_url: Optional[str] = Field(default=None, max_length=500)
    status: Optional[str] = Field(default=None, max_length=16)
    is_available_for_public_booking: Optional[bool] = None
    service_ids: Optional[list[str]] = None


class StaffRead(BaseModel):
    id: uuid.UUID
    tenant_id: uuid.UUID
    user_id: str
    name: str
    first_name: str
    last_name: str
    email: str
    specialties: list[str] = Field(default_factory=list)
    certifications: list[str] = Field(default_factory=list)
    payment_type: str
    payment_rate: Decimal
    hire_date: Optional[date] = None
    bio: Optional[str] = None
    profile_image_url: Optional[str] = None
    status: str
    is_available_for_public_booking: bool
    service_ids: list[str] = Field(default_factory=list)
    rating: Optional[Decimal] = None
    review_count: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
