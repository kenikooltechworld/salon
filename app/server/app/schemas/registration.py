"""Schemas for two-phase registration flow."""
from __future__ import annotations

from pydantic import BaseModel, EmailStr, Field


class RegisterRequest(BaseModel):
    salon_name: str = Field(min_length=3, max_length=255)
    owner_name: str = Field(min_length=2, max_length=255)
    email: EmailStr
    phone: str = Field(min_length=7, max_length=20)
    password: str = Field(min_length=8, max_length=128)
    address: str = Field(min_length=5, max_length=500)
    bank_account: str | None = Field(default=None, max_length=50)
    referral_code: str | None = Field(default=None, max_length=64)


class RegisterResponse(BaseModel):
    success: bool = True
    message: str
    data: dict


class VerifyCodeRequest(BaseModel):
    email: EmailStr
    code: str = Field(min_length=6, max_length=6)


class VerifyCodeResponse(BaseModel):
    success: bool
    message: str
    data: dict | None = None


class ResendCodeRequest(BaseModel):
    email: EmailStr


class ResendCodeResponse(BaseModel):
    success: bool
    message: str
    data: dict | None = None
