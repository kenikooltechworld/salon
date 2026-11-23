"""Schemas for appointment history."""
from __future__ import annotations

import uuid
from datetime import datetime
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel, Field


class AppointmentHistoryRead(BaseModel):
    id: uuid.UUID
    tenant_id: uuid.UUID
    customer_id: uuid.UUID
    appointment_id: uuid.UUID
    service_id: uuid.UUID
    staff_id: uuid.UUID
    appointment_date: datetime
    duration_minutes: int
    amount_paid: Decimal
    notes: Optional[str] = None
    rating: Optional[int] = Field(default=None, ge=1, le=5)
    feedback: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class AppointmentHistoryListResponse(BaseModel):
    history: list[AppointmentHistoryRead]
    total: int
    page: int
    page_size: int
