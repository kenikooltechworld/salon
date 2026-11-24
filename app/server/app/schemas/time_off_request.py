from __future__ import annotations
from pydantic import BaseModel, Field
from datetime import date, datetime
import uuid

class TimeOffRequestCreate(BaseModel):
    staff_id: str
    start_date: date
    end_date: date
    reason: str

class TimeOffRequestUpdate(BaseModel):
    start_date: date | None = None
    end_date: date | None = None
    reason: str | None = None

class TimeOffRequestRead(BaseModel):
    id: uuid.UUID
    staff_id: str
    start_date: date
    end_date: date
    reason: str
    status: str
    requested_at: datetime
    reviewed_at: datetime | None = None
    reviewed_by: str | None = None
    denial_reason: str | None = None
    created_at: datetime
    updated_at: datetime
    model_config = {'from_attributes': True}

class TimeOffRequestListResponse(BaseModel):
    requests: list[TimeOffRequestRead]
    total: int
    page: int
    page_size: int
