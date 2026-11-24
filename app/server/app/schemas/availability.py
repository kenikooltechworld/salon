"""Availability schemas."""
from __future__ import annotations

from datetime import date, datetime, time
from typing import Optional, List

from pydantic import BaseModel, Field, model_validator


class BreakTime(BaseModel):
    start_time: time
    end_time: time

    @model_validator(mode="after")
    def validate_order(self):
        if self.start_time >= self.end_time:
            raise ValueError("Break start_time must be before end_time")
        return self


class AvailabilityCreateRequest(BaseModel):
    model_config = {"extra": "forbid"}

    staff_id: str = Field(min_length=1, max_length=64)
    day_of_week: Optional[int] = Field(None, ge=0, le=6)
    start_time: time
    end_time: time
    is_recurring: bool = False
    effective_from: date
    effective_to: Optional[date] = None
    breaks: List[BreakTime] = Field(default_factory=list)
    slot_interval_minutes: int = Field(default=30, ge=5, le=240)
    buffer_time_minutes: int = Field(default=15, ge=0, le=240)
    concurrent_bookings_allowed: int = Field(default=1, ge=1, le=10)
    is_active: bool = True
    notes: Optional[str] = Field(None, max_length=500)

    @model_validator(mode="after")
    def validate_schedule(self):
        if self.start_time >= self.end_time:
            raise ValueError("start_time must be before end_time")
        if self.effective_to and self.effective_from > self.effective_to:
            raise ValueError("effective_from must be before or equal to effective_to")
        if self.is_recurring and self.day_of_week is None:
            raise ValueError("day_of_week is required for recurring schedules")
        if not self.is_recurring and self.day_of_week is not None:
            raise ValueError("day_of_week must not be set for non-recurring schedules")
        self.validate_breaks()
        return self

    def validate_breaks(self):
        previous_end: time | None = None
        for item in sorted(self.breaks, key=lambda value: value.start_time):
            if item.start_time < self.start_time or item.end_time > self.end_time:
                raise ValueError("Breaks must be within working hours")
            if previous_end is not None and item.start_time < previous_end:
                raise ValueError("Breaks must not overlap")
            previous_end = item.end_time


class AvailabilityUpdateRequest(BaseModel):
    model_config = {"extra": "forbid"}

    day_of_week: Optional[int] = Field(None, ge=0, le=6)
    start_time: Optional[time] = None
    end_time: Optional[time] = None
    is_recurring: Optional[bool] = None
    effective_from: Optional[date] = None
    effective_to: Optional[date] = None
    breaks: Optional[List[BreakTime]] = None
    slot_interval_minutes: Optional[int] = Field(None, ge=5, le=240)
    buffer_time_minutes: Optional[int] = Field(None, ge=0, le=240)
    concurrent_bookings_allowed: Optional[int] = Field(None, ge=1, le=10)
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
    slot_interval_minutes: int = 30
    buffer_time_minutes: int = 15
    concurrent_bookings_allowed: int = 1
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
