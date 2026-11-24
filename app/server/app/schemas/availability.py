"""Availability schemas."""
from __future__ import annotations

from datetime import date, datetime, time
from typing import Optional, List

from pydantic import BaseModel, Field


class BreakTime(BaseModel):
    start_time: time
    end_time: time


class AvailabilityCreateRequest(BaseModel):
    staff_id: str
    day_of_week: Optional[int] = Field(None, ge=0, le=6)
    start_time: time
    end_time: time
    is_recurring: bool = False
    effective_from: date
    effective_to: Optional[date] = None
    breaks: List[BreakTime] = Field(default_factory=list)
    is_active: bool = True
    notes: Optional[str] = Field(None, max_length=500)


class AvailabilityUpdateRequest(BaseModel):
    day_of_week: Optional[int] = Field(None, ge=0, le=6)
    start_time: Optional[time] = None
    end_time: Optional[time] = None
    is_recurring: Optional[bool] = None
    effective_from: Optional[date] = None
    effective_to: Optional[date] = None
    breaks: Optional[List[BreakTime]] = None
    is_active: Optional[bool] = None
    notes: Optional[str] = Field(None, max_length=500)


class AvailabilityResponse(BaseModel):
    id: str
    staff_id: str
    day_of_week: Optional[int] = None
    start_time: str
    end_time: str
    is_recurring: bool
    effective_from: str
    effective_to: Optional[str] = None
    breaks: List[dict] = Field(default_factory=list)
    is_active: bool
    notes: Optional[str] = None
    created_at: str
    updated_at: str

    model_config = {"from_attributes": True}


class AvailabilityListResponse(BaseModel):
    availabilities: List[AvailabilityResponse]
    total: int
    page: int
    page_size: int


class AvailableSlot(BaseModel):
    start_time: str
    end_time: str
    staff_id: str
    duration_minutes: int
    isAvailable: bool


class AvailableSlotsResponse(BaseModel):
    date: str
    slots: List[AvailableSlot]
    staff_id: Optional[str] = None
    total_slots: int
