from __future__ import annotations
from pydantic import BaseModel, Field
from datetime import datetime
from decimal import Decimal
import uuid

class ShiftCreate(BaseModel):
    staff_id: str
    start_time: datetime
    end_time: datetime
    status: str = 'scheduled'

class ShiftUpdate(BaseModel):
    status: str | None = None
    start_time: datetime | None = None
    end_time: datetime | None = None

class ShiftRead(BaseModel):
    id: uuid.UUID
    staff_id: str
    start_time: datetime
    end_time: datetime
    status: str
    labor_cost: Decimal | None = None
    created_at: datetime
    updated_at: datetime
    model_config = {'from_attributes': True}

class ShiftListResponse(BaseModel):
    shifts: list[ShiftRead]
    total: int
    page: int
    page_size: int
