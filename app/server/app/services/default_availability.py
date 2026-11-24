"""Default weekday availability used when creating and seeding staff schedules."""
from __future__ import annotations

import uuid
from datetime import date

from app.models.availability import Availability


def build_default_staff_availability(
    tenant_id: uuid.UUID,
    staff_id: str,
    effective_from: date | None = None,
) -> list[Availability]:
    """Build the same Monday-Friday schedule as the legacy availability seed."""
    starts_on = effective_from or date.today()
    return [
        Availability(
            tenant_id=tenant_id,
            staff_id=staff_id,
            day_of_week=day_of_week,
            start_time="09:00:00",
            end_time="17:00:00",
            is_recurring=True,
            effective_from=starts_on,
            effective_to=None,
            breaks=[{"start_time": "12:00:00", "end_time": "13:00:00"}],
            slot_interval_minutes=30,
            buffer_time_minutes=15,
            concurrent_bookings_allowed=1,
            is_active=True,
            notes="Default availability schedule",
        )
        for day_of_week in range(5)
    ]
