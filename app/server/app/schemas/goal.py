from __future__ import annotations
from pydantic import BaseModel
from datetime import datetime
import uuid

class GoalCreate(BaseModel):
    goal_type: str
    target_value: float
    period_start: str
    period_end: str

class GoalRead(BaseModel):
    id: uuid.UUID
    staff_id: str
    goal_type: str
    target_value: float
    current_value: float
    period_start: datetime
    period_end: datetime
    status: str
    is_active: bool
    created_at: datetime
    updated_at: datetime
    model_config = {'from_attributes': True}
