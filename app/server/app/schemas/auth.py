"""Pydantic schemas for auth and tenancy."""
from __future__ import annotations

import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, EmailStr, Field


class TenantCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    subdomain: str = Field(min_length=1, max_length=63, pattern=r"^[a-z0-9-]+$")
    email: Optional[EmailStr] = None
    description: Optional[str] = Field(default=None, max_length=1000)


class TenantRead(BaseModel):
    id: uuid.UUID
    name: str
    subdomain: str
    email: Optional[str] = None
    subscription_tier: str
    status: str
    created_at: datetime

    model_config = {"from_attributes": True}


class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    first_name: str = Field(min_length=1, max_length=100)
    last_name: str = Field(min_length=1, max_length=100)
    phone: Optional[str] = Field(default=None, max_length=20)
    role: str = Field(default="owner", max_length=32)


class UserRead(BaseModel):
    id: uuid.UUID
    tenant_id: uuid.UUID
    email: str
    first_name: str
    last_name: str
    phone: Optional[str] = None
    role: str
    status: str
    created_at: datetime

    model_config = {"from_attributes": True}


class RegisterRequest(BaseModel):
    tenant: TenantCreate
    user: UserCreate


class RegisterResponse(BaseModel):
    tenant: TenantRead
    user: UserRead


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int


class MeResponse(BaseModel):
    user: UserRead
    tenant: TenantRead
