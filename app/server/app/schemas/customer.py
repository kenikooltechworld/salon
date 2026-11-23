"""Schemas for customers."""
from __future__ import annotations

import uuid
from datetime import date, datetime
from decimal import Decimal
from typing import Literal, Optional

from pydantic import BaseModel, EmailStr, Field

CommunicationPreference = Literal["email", "sms", "phone", "none"]
CustomerStatus = Literal["active", "inactive"]


class CustomerCreate(BaseModel):
    first_name: str = Field(min_length=1, max_length=100)
    last_name: str = Field(min_length=1, max_length=100)
    email: EmailStr
    phone: str = Field(min_length=1, max_length=20)
    address: Optional[str] = Field(default=None, max_length=500)
    date_of_birth: Optional[date] = None
    profile_image_url: Optional[str] = Field(default=None, max_length=500)
    preferred_staff_id: Optional[str] = Field(default=None, max_length=64)
    preferred_services: list[str] = Field(default_factory=list)
    communication_preference: CommunicationPreference = "email"
    status: CustomerStatus = "active"
    notification_preferences: Optional[dict] = None


class CustomerUpdate(BaseModel):
    first_name: Optional[str] = Field(default=None, min_length=1, max_length=100)
    last_name: Optional[str] = Field(default=None, min_length=1, max_length=100)
    email: Optional[EmailStr] = None
    phone: Optional[str] = Field(default=None, min_length=1, max_length=20)
    address: Optional[str] = Field(default=None, max_length=500)
    date_of_birth: Optional[date] = None
    profile_image_url: Optional[str] = Field(default=None, max_length=500)
    preferred_staff_id: Optional[str] = Field(default=None, max_length=64)
    preferred_services: Optional[list[str]] = None
    communication_preference: Optional[CommunicationPreference] = None
    status: Optional[CustomerStatus] = None
    notification_preferences: Optional[dict] = None


class CustomerRead(BaseModel):
    id: uuid.UUID
    tenant_id: uuid.UUID
    first_name: str
    last_name: str
    email: str
    phone: str
    address: Optional[str] = None
    date_of_birth: Optional[date] = None
    profile_image_url: Optional[str] = None
    preferred_staff_id: Optional[str] = None
    preferred_services: list[str] = Field(default_factory=list)
    communication_preference: str
    status: str
    outstanding_balance: Decimal
    is_guest: bool
    email_verified: bool = False
    phone_verified: bool = False
    has_portal_access: bool = False
    notification_preferences: Optional[dict] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class CustomerListResponse(BaseModel):
    customers: list[CustomerRead]
    total: int
    page: int
    page_size: int
