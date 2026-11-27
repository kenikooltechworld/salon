"""Default weekday availability used when creating and seeding staff schedules."""
from __future__ import annotations

import uuid
from datetime import date

from app.models.availability import Availability


DEFAULT_BREAKS = [{"start_time": "12:00:00", "end_time": "13:00:00"}]


def _is_closed(business_hours: dict, day_of_week: int) -> bool:
    """Check if a day is marked closed in tenant business hours."""
    day_key = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"][day_of_week]
    day_settings = business_hours.get(day_key)
    return day_settings is not None and day_settings.get("is_closed", False)


def _get_hours(business_hours: dict, day_of_week: int):
    """Get open/close times for a day from tenant business hours."""
    day_key = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"][day_of_week]
    day_settings = business_hours.get(day_key)
    if not day_settings:
        return "09:00", "17:00"
    return day_settings.get("open_time", "09:00"), day_settings.get("close_time", "17:00")


def build_default_staff_availability(
    tenant_id: uuid.UUID,
    staff_id: str,
    effective_from: date | None = None,
    business_hours: dict | None = None,
) -> list[Availability]:
    """Build staff availability schedule.

    If business_hours (tenant settings) is provided, derive availability from it,
    skipping days marked is_closed=True. Otherwise falls back to Monday-Sunday 9-5.
    """
    starts_on = effective_from or date.today()
    business_hours = business_hours or {}
    availability_records = []

    for day_of_week in range(7):
        day_name = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"][day_of_week]

        # Skip days marked closed in tenant business hours
        if _is_closed(business_hours, day_of_week):
            continue

        open_time, close_time = _get_hours(business_hours, day_of_week)

        availability_records.append(
            Availability(
                tenant_id=tenant_id,
                staff_id=staff_id,
                day_of_week=day_of_week,
                start_time=f"{open_time}:00",
                end_time=f"{close_time}:00",
                is_recurring=True,
                effective_from=starts_on,
                effective_to=None,
                breaks=DEFAULT_BREAKS,
                slot_interval_minutes=30,
                buffer_time_minutes=15,
                concurrent_bookings_allowed=1,
                is_active=True,
                notes="Derived from tenant business hours",
            )
        )

    return availability_records