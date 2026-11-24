from __future__ import annotations
from pydantic import BaseModel, Field
from datetime import datetime
import uuid

class StaffSettingsUpdate(BaseModel):
    first_name: str | None = None
    last_name: str | None = None
    phone: str | None = None
    email_bookings: bool | None = None
    email_reminders: bool | None = None
    email_messages: bool | None = None
    sms_bookings: bool | None = None
    sms_reminders: bool | None = None
    push_bookings: bool | None = None
    push_reminders: bool | None = None
    working_hours_start: str | None = None
    working_hours_end: str | None = None
    days_off: list[str] | None = None
    emergency_contact_name: str | None = None
    emergency_contact_phone: str | None = None
    emergency_contact_relationship: str | None = None
    service_specializations: list[str] | None = None
    preferred_customer_types: list[str] | None = None

class StaffSettingsRead(BaseModel):
    id: uuid.UUID
    user_id: str
    first_name: str
    last_name: str
    phone: str | None = None
    email_bookings: bool = True
    email_reminders: bool = True
    email_messages: bool = True
    sms_bookings: bool = False
    sms_reminders: bool = False
    push_bookings: bool = True
    push_reminders: bool = True
    working_hours_start: str | None = None
    working_hours_end: str | None = None
    days_off: list[str] = Field(default_factory=list)
    emergency_contact_name: str | None = None
    emergency_contact_phone: str | None = None
    emergency_contact_relationship: str | None = None
    service_specializations: list[str] = Field(default_factory=list)
    preferred_customer_types: list[str] = Field(default_factory=list)
    created_at: datetime
    updated_at: datetime
    model_config = {'from_attributes': True}
