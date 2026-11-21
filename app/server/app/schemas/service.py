"""Schemas for services and service categories."""
from __future__ import annotations

import uuid
from datetime import datetime
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel, Field


class ServiceCategoryCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    description: Optional[str] = Field(default=None, max_length=500)
    color: Optional[str] = Field(default=None, max_length=7)
    icon: Optional[str] = Field(default=None, max_length=50)
    is_active: bool = True


class ServiceCategoryUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=100)
    description: Optional[str] = Field(default=None, max_length=500)
    color: Optional[str] = Field(default=None, max_length=7)
    icon: Optional[str] = Field(default=None, max_length=50)
    is_active: Optional[bool] = None


class ServiceCategoryRead(BaseModel):
    id: uuid.UUID
    tenant_id: uuid.UUID
    name: str
    description: Optional[str] = None
    color: Optional[str] = None
    icon: Optional[str] = None
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ServiceCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    description: Optional[str] = Field(default=None, max_length=1000)
    duration_minutes: int = Field(ge=1)
    price: Decimal = Field(ge=0)
    category: str = Field(min_length=1, max_length=100)
    color: Optional[str] = Field(default=None, max_length=7)
    icon: Optional[str] = Field(default=None, max_length=50)
    is_active: bool = True
    is_published: bool = False
    public_description: Optional[str] = Field(default=None, max_length=1000)
    public_image_url: Optional[str] = Field(default=None, max_length=500)
    allow_public_booking: bool = False
    allow_pay_now: bool = False
    tags: list[str] = Field(default_factory=list)
    benefits: list[str] = Field(default_factory=list)
    commission_percentage: Optional[Decimal] = Field(default=None, ge=0, le=100)


class ServiceUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=255)
    description: Optional[str] = Field(default=None, max_length=1000)
    duration_minutes: Optional[int] = Field(default=None, ge=1)
    price: Optional[Decimal] = Field(default=None, ge=0)
    category: Optional[str] = Field(default=None, min_length=1, max_length=100)
    color: Optional[str] = Field(default=None, max_length=7)
    icon: Optional[str] = Field(default=None, max_length=50)
    is_active: Optional[bool] = None
    is_published: Optional[bool] = None
    public_description: Optional[str] = Field(default=None, max_length=1000)
    public_image_url: Optional[str] = Field(default=None, max_length=500)
    allow_public_booking: Optional[bool] = None
    allow_pay_now: Optional[bool] = None
    tags: Optional[list[str]] = None
    benefits: Optional[list[str]] = None
    commission_percentage: Optional[Decimal] = Field(default=None, ge=0, le=100)


class ServiceRead(BaseModel):
    id: uuid.UUID
    tenant_id: uuid.UUID
    name: str
    description: Optional[str] = None
    duration_minutes: int
    price: Decimal
    category: str
    color: Optional[str] = None
    icon: Optional[str] = None
    is_active: bool
    is_published: bool
    public_description: Optional[str] = None
    public_image_url: Optional[str] = None
    allow_public_booking: bool
    allow_pay_now: bool
    tags: list[str] = Field(default_factory=list)
    benefits: list[str] = Field(default_factory=list)
    commission_percentage: Optional[Decimal] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
