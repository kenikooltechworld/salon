"""Schemas for two-phase registration flow."""
from __future__ import annotations

import re

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


def validate_phone(value: str) -> str:
    cleaned = re.sub(r"[\s\-()]", "", value.strip())
    if not re.fullmatch(r"\+?[0-9]{7,20}", cleaned):
        raise ValueError("Phone must be a valid number (7-20 digits, optional +)")
    return cleaned


class RegisterRequest(BaseModel):
    salon_name: str = Field(min_length=3, max_length=255)
    owner_name: str = Field(min_length=2, max_length=255)
    email: EmailStr
    phone: str = Field(min_length=7, max_length=20)
    password: str = Field(min_length=8, max_length=128)
    address: str = Field(min_length=5, max_length=500)
    bank_account: str | None = Field(default=None, max_length=50)
    referral_code: str | None = Field(default=None, max_length=64)

    @field_validator("salon_name", "owner_name", "address")
    @classmethod
    def strip_required(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("This field is required")
        return v

    @field_validator("phone")
    @classmethod
    def _phone(cls, v: str) -> str:
        return validate_phone(v)

    @field_validator("password")
    @classmethod
    def _password(cls, v: str) -> str:
        return validate_strong_password(v)

    @field_validator("bank_account", "referral_code", mode="before")
    @classmethod
    def empty_to_none(cls, v):
        if isinstance(v, str):
            v = v.strip()
            return v or None
        return v


class RegisterResponse(BaseModel):
    success: bool = True
    message: str
    data: dict


class VerifyCodeRequest(BaseModel):
    email: EmailStr
    code: str = Field(min_length=6, max_length=6)

    @field_validator("code")
    @classmethod
    def digits(cls, v: str) -> str:
        v = v.strip()
        if not re.fullmatch(r"\d{6}", v):
            raise ValueError("Code must be 6 digits")
        return v


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
