from __future__ import annotations

from typing import Dict, Literal, Optional

from pydantic import BaseModel, Field, field_validator


class BusinessHoursDay(BaseModel):
    open_time: str = Field(pattern=r"^([01]\d|2[0-3]):[0-5]\d$")
    close_time: str = Field(pattern=r"^([01]\d|2[0-3]):[0-5]\d$")
    is_closed: bool = False


def default_business_hours() -> Dict[str, BusinessHoursDay]:
    return {
        "monday": BusinessHoursDay(open_time="09:00", close_time="18:00"),
        "tuesday": BusinessHoursDay(open_time="09:00", close_time="18:00"),
        "wednesday": BusinessHoursDay(open_time="09:00", close_time="18:00"),
        "thursday": BusinessHoursDay(open_time="09:00", close_time="18:00"),
        "friday": BusinessHoursDay(open_time="09:00", close_time="18:00"),
        "saturday": BusinessHoursDay(open_time="10:00", close_time="16:00"),
        "sunday": BusinessHoursDay(open_time="00:00", close_time="00:00", is_closed=True),
    }


class TenantSettingsSchema(BaseModel):
    salon_name: str = Field(min_length=1, max_length=255)
    email: str = Field(min_length=1, max_length=255)
    phone: str = Field(default="", max_length=20)
    address: str = Field(default="", max_length=500)
    tax_rate: float = Field(default=0.0, ge=0, le=100)
    currency: str = Field(default="NGN", max_length=8)
    timezone: str = Field(default="Africa/Lagos", max_length=64)
    language: str = Field(default="en", max_length=8)
    business_hours: Dict[str, BusinessHoursDay] = Field(default_factory=default_business_hours)
    notification_email: bool = True
    notification_sms: bool = False
    notification_push: bool = False
    logo_url: Optional[str] = Field(default=None, max_length=1000)
    primary_color: str = Field(default="#000000", max_length=7)
    secondary_color: str = Field(default="#FFFFFF", max_length=7)
    appointment_reminder_hours: int = Field(default=24, ge=1, le=168)
    allow_online_booking: bool = True
    require_customer_approval: bool = False
    auto_confirm_bookings: bool = True

    @field_validator("primary_color", "secondary_color")
    @classmethod
    def validate_hex(cls, v: str) -> str:
        value = v.strip()
        if not (len(value) == 7 and value.startswith("#")):
            raise ValueError("Color must be #RRGGBB")
        int(value[1:], 16)
        return value.upper()
