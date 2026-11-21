"""Pydantic schemas for auth and tenancy."""
from __future__ import annotations

import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, EmailStr, Field, field_validator


class TenantCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    subdomain: str | None = Field(default=None, max_length=63)

    @field_validator("subdomain")
    @classmethod
    def validate_subdomain(cls, v):
        if v is None:
            return v
        v = v.strip().lower()
        from app.lib.subdomain import is_valid_subdomain
        if not is_valid_subdomain(v):
            raise ValueError("Invalid subdomain")
        return v
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

class ChangePasswordRequest(BaseModel):
    current_password: str = Field(min_length=1)
    new_password: str = Field(min_length=8, max_length=128)


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    email: EmailStr
    code: str = Field(min_length=6, max_length=6)
    new_password: str = Field(min_length=8, max_length=128)


class ForgotPasswordResponse(BaseModel):
    message: str
    # Only populated in debug mode for testing
    reset_code: str | None = None

class SendVerificationResponse(BaseModel):
    message: str
    # Only populated in debug mode for testing
    verification_code: str | None = None


class VerifyEmailRequest(BaseModel):
    code: str = Field(min_length=6, max_length=6)


class VerifyEmailResponse(BaseModel):
    message: str
    email_verified: bool

class MfaSetupResponse(BaseModel):
    secret: str
    otpauth_uri: str
    qr_code: str
    backup_codes: list[str]


class MfaVerifyRequest(BaseModel):
    code: str = Field(min_length=6, max_length=6)


class MfaVerifyResponse(BaseModel):
    message: str
    mfa_enabled: bool


class MfaValidateRequest(BaseModel):
    email: str
    code: str = Field(min_length=6, max_length=6)


class MfaDisableRequest(BaseModel):
    password: str
    code: str = Field(min_length=6, max_length=6)

