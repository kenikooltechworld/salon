"""Customer preference schemas."""
from __future__ import annotations

import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class CustomerPreferenceCreate(BaseModel):
    preferred_staff_ids: list[str] = Field(default_factory=list)
    preferred_service_ids: list[str] = Field(default_factory=list)
    communication_methods: list[str] = Field(default_factory=lambda: ["email"])
    preferred_time_slots: list[str] = Field(default_factory=list)
    language: str = Field(default="en", max_length=10)
    notes: Optional[str] = Field(default=None, max_length=1000)


class CustomerPreferenceUpdate(BaseModel):
    preferred_staff_ids: Optional[list[str]] = None
    preferred_service_ids: Optional[list[str]] = None
    communication_methods: Optional[list[str]] = None
    preferred_time_slots: Optional[list[str]] = None
    language: Optional[str] = Field(default=None, max_length=10)
    notes: Optional[str] = Field(default=None, max_length=1000)


class CustomerPreferenceRead(BaseModel):
    id: uuid.UUID
    tenant_id: uuid.UUID
    customer_id: str
    preferred_staff_ids: list[str] = Field(default_factory=list)
    preferred_service_ids: list[str] = Field(default_factory=list)
    communication_methods: list[str] = Field(default_factory=list)
    preferred_time_slots: list[str] = Field(default_factory=list)
    language: str
    notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
