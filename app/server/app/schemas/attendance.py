from __future__ import annotations
from pydantic import BaseModel
from datetime import datetime
import uuid

class ClockInRequest(BaseModel):
    staff_id: str | None = None
    notes: str | None = None

class ClockOutRequest(BaseModel):
    staff_id: str | None = None
    notes: str | None = None

class AttendanceRead(BaseModel):
    id: uuid.UUID
    staff_id: str
    shift_id: str | None = None
    check_in_time: datetime
    check_out_time: datetime | None = None
    date: datetime
    status: str
    hours_worked: float | None = 0.0
    break_minutes: int = 0
    is_late: bool = False
    is_early_departure: bool = False
    notes: str | None = None
    created_at: datetime
    updated_at: datetime
    model_config = {'from_attributes': True}
