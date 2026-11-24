"""Schemas for staff."""
from __future__ import annotations

import uuid
from datetime import date, datetime
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel, Field


class StaffCreate(BaseModel):
    user_id: str | None = Field(default=None, max_length=64)
    firstName: str = Field(min_length=1, max_length=100)
    lastName: str = Field(min_length=1, max_length=100)
    email: str = Field(min_length=1, max_length=255)
    phone: str | None = Field(default=None, max_length=20)
    role_ids: list[str] = Field(default_factory=list)
    service_ids: list[str] = Field(default_factory=list)
    specialties: list[str] = Field(default_factory=list)
    certifications: list[str] = Field(default_factory=list)
    certification_files: list[str] = Field(default_factory=list)
    payment_type: str = Field(default="hourly", max_length=16)
    payment_rate: Decimal = Field(default=Decimal("0"), ge=0)
    hire_date: Optional[date] = None
    bio: Optional[str] = Field(default=None, max_length=500)
    profile_image_url: Optional[str] = Field(default=None, max_length=500)
    status: str = Field(default="active", max_length=16)
    is_available_for_public_booking: bool = False


class StaffUpdate(BaseModel):
    firstName: str | None = Field(default=None, min_length=1, max_length=100)
    lastName: str | None = Field(default=None, min_length=1, max_length=100)
    email: str | None = Field(default=None, min_length=1, max_length=255)
    phone: str | None = Field(default=None, max_length=20)
    role_ids: list[str] | None = None
    service_ids: Optional[list[str]] = None
    specialties: Optional[list[str]] = None
    certifications: Optional[list[str]] = None
    certification_files: Optional[list[str]] = None
    payment_type: Optional[str] = Field(default=None, max_length=16)
    payment_rate: Optional[Decimal] = Field(default=None, ge=0)
    hire_date: Optional[date] = None
    bio: Optional[str] = Field(default=None, max_length=500)
    profile_image_url: Optional[str] = Field(default=None, max_length=500)
    status: Optional[str] = Field(default=None, max_length=16)
    is_available_for_public_booking: Optional[bool] = None


class StaffRead(BaseModel):
    id: uuid.UUID
    tenant_id: uuid.UUID
    user_id: str
    firstName: str
    lastName: str
    email: str
    phone: str | None = None
    role_ids: list[str] = Field(default_factory=list)
    service_ids: list[str] = Field(default_factory=list)
    specialties: list[str] = Field(default_factory=list)
    certifications: list[str] = Field(default_factory=list)
    certification_files: list[str] = Field(default_factory=list)
    payment_type: str
    payment_rate: Decimal
    hire_date: Optional[date] = None
    bio: Optional[str] = None
    profile_image_url: Optional[str] = None
    status: str
    is_available_for_public_booking: bool
    rating: Optional[Decimal] = None
    review_count: int
    createdAt: datetime
    updatedAt: datetime

    model_config = {"from_attributes": True}


class StaffListResponse(BaseModel):
    staff: list[StaffRead]
    total: int
    page: int
    page_size: int
