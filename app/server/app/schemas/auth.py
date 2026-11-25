"""Pydantic schemas for auth and tenancy."""
from __future__ import annotations

import re
import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, EmailStr, Field, field_validator


def validate_strong_password(value: str) -> str:
    if len(value) < 8:
        raise ValueError("Password must be at least 8 characters")
    if not re.search(r"[A-Z]", value):
        raise ValueError("Password must contain an uppercase letter")
    if not re.search(r"[a-z]", value):
        raise ValueError("Password must contain a lowercase letter")
    if not re.search(r"[0-9]", value):
        raise ValueError("Password must contain a number")
    if not re.search(r"[^A-Za-z0-9]", value):
        raise ValueError("Password must contain a special character")
    return value


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
    phone: Optional[str] = None
    description: Optional[str] = None
    logo_url: Optional[str] = None
    primary_color: Optional[str] = None
    secondary_color: Optional[str] = None
    subscription_tier: str
    status: str
    address: Optional[str] = None
    region: str = "us-east-1"
    is_published: bool = True
    created_at: datetime

    model_config = {"from_attributes": True}


class TenantSettingsUpdate(BaseModel):
    salon_name: str | None = Field(default=None, min_length=1, max_length=255)
    email: EmailStr | None = None
    phone: str | None = Field(default=None, max_length=20)
    address: str | None = Field(default=None, max_length=500)
    description: str | None = Field(default=None, max_length=1000)
    logo_url: str | None = Field(default=None, max_length=500)
    primary_color: str | None = Field(default=None, max_length=7)
    secondary_color: str | None = Field(default=None, max_length=7)


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
    email_verified: bool = False
    mfa_enabled: bool = False
    last_login: datetime | None = None
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
    password: str = Field(min_length=1, max_length=128)


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

    @field_validator("new_password")
    @classmethod
    def _new_password(cls, v: str) -> str:
        return validate_strong_password(v)


class ChangePasswordRequiredRequest(BaseModel):
    new_password: str = Field(min_length=8, max_length=128)

    @field_validator("new_password")
    @classmethod
    def _new_password(cls, v: str) -> str:
        return validate_strong_password(v)


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    email: EmailStr
    code: str = Field(min_length=6, max_length=6)
    new_password: str = Field(min_length=8, max_length=128)

    @field_validator("code")
    @classmethod
    def _code(cls, v: str) -> str:
        v = v.strip()
        if not re.fullmatch(r"\d{6}", v):
            raise ValueError("Code must be 6 digits")
        return v

    @field_validator("new_password")
    @classmethod
    def _new_password(cls, v: str) -> str:
        return validate_strong_password(v)


class ForgotPasswordResponse(BaseModel):
    message: str
    # Only populated in debug mode for testing
    reset_code: str | None = None

class SendVerificationRequest(BaseModel):
    email: EmailStr | None = None


class SendVerificationResponse(BaseModel):
    message: str
    # Only populated in debug mode for testing
    verification_code: str | None = None


class VerifyEmailRequest(BaseModel):
    code: str = Field(min_length=6, max_length=6)
    email: EmailStr | None = None


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

    @field_validator("code")
    @classmethod
    def _code(cls, v: str) -> str:
        v = v.strip()
        if not re.fullmatch(r"\d{6}", v):
            raise ValueError("Code must be 6 digits")
        return v


class MfaVerifyResponse(BaseModel):
    message: str
    mfa_enabled: bool


class MfaValidateRequest(BaseModel):
    email: str
    code: str = Field(min_length=6, max_length=6)

    @field_validator("code")
    @classmethod
    def _code(cls, v: str) -> str:
        v = v.strip()
        if not re.fullmatch(r"\d{6}", v):
            raise ValueError("Code must be 6 digits")
        return v


class MfaDisableRequest(BaseModel):
    password: str
    code: str = Field(min_length=6, max_length=6)

    @field_validator("code")
    @classmethod
    def _code(cls, v: str) -> str:
        v = v.strip()
        if not re.fullmatch(r"\d{6}", v):
            raise ValueError("Code must be 6 digits")
        return v


class RecoverAccountRequest(BaseModel):
    recovery_token: str = Field(min_length=1)


class RecoverAccountResponse(BaseModel):
    success: bool
    detail: str

