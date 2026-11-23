"""Schemas for service packages."""
from __future__ import annotations

import uuid
from datetime import datetime
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel, Field, model_validator


class ServicePackageItem(BaseModel):
    service_id: uuid.UUID
    quantity: int = Field(ge=1, default=1)


class ServicePackageItemRead(ServicePackageItem):
    service_name: str | None = None
    service_price: Decimal | None = None
    service_duration_minutes: int | None = None


class ServicePackageCreate(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    description: Optional[str] = Field(default=None, max_length=1000)
    services: list[ServicePackageItem] = Field(min_length=1)
    package_price: Decimal = Field(ge=0, max_digits=10, decimal_places=2)
    valid_from: Optional[datetime] = None
    valid_until: Optional[datetime] = None
    is_active: bool = True
    max_bookings_per_customer: Optional[int] = Field(default=None, ge=1)
    total_bookings_limit: Optional[int] = Field(default=None, ge=1)
    image_url: Optional[str] = Field(default=None, max_length=500)
    display_order: int = 0
    is_featured: bool = False

    @model_validator(mode="after")
    def validate_dates(self):
        if self.valid_from and self.valid_until and self.valid_until <= self.valid_from:
            raise ValueError("valid_until must be after valid_from")
        return self


class ServicePackageUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=200)
    description: Optional[str] = Field(default=None, max_length=1000)
    services: Optional[list[ServicePackageItem]] = Field(default=None, min_length=1)
    package_price: Optional[Decimal] = Field(default=None, ge=0, max_digits=10, decimal_places=2)
    valid_from: Optional[datetime] = None
    valid_until: Optional[datetime] = None
    is_active: Optional[bool] = None
    max_bookings_per_customer: Optional[int] = Field(default=None, ge=1)
    total_bookings_limit: Optional[int] = Field(default=None, ge=1)
    image_url: Optional[str] = Field(default=None, max_length=500)
    display_order: Optional[int] = None
    is_featured: Optional[bool] = None

    @model_validator(mode="after")
    def validate_dates(self):
        if self.valid_from and self.valid_until and self.valid_until <= self.valid_from:
            raise ValueError("valid_until must be after valid_from")
        return self


class ServicePackageRead(BaseModel):
    id: uuid.UUID
    tenant_id: uuid.UUID
    name: str
    description: Optional[str] = None
    services: list[ServicePackageItemRead] = Field(default_factory=list)
    original_price: Decimal
    package_price: Decimal
    discount_amount: Decimal
    discount_percentage: Decimal
    valid_from: Optional[datetime] = None
    valid_until: Optional[datetime] = None
    is_active: bool
    max_bookings_per_customer: Optional[int] = None
    total_bookings_limit: Optional[int] = None
    current_bookings_count: int
    image_url: Optional[str] = None
    display_order: int
    is_featured: bool
    is_valid: bool = True
    total_duration_minutes: int = 0
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ServicePackageListResponse(BaseModel):
    packages: list[ServicePackageRead]
    total: int
    page: int
    page_size: int
    total_pages: int = 1
