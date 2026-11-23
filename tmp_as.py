from pathlib import Path
p = Path('app/server/app/schemas/availability.py')
p.write_text("""\"\"\"Availability schemas.\"\"\"
from __future__ import annotations

import uuid
from datetime import date

from pydantic import BaseModel, Field


class AvailabilityRead(BaseModel):
    model_config = {"from_attributes": True}

    id: uuid.UUID
    staff_id: str
    day_of_week: int | None = None
    start_time: str
    end_time: str
    is_recurring: bool
    effective_from: date
    effective_to: date | None = None
    breaks: list[dict] = Field(default_factory=list)
    slot_interval_minutes: int = 30
    buffer_time_minutes: int = 15
    concurrent_bookings_allowed: int = 1
    is_active: bool = True
    notes: str | None = None
""", encoding='utf-8')
print('ok')
