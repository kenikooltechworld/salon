import uuid
from datetime import date

import pytest

from app.services.default_availability import build_default_staff_availability
from app.services.staff_service import StaffService


class AvailabilitySession:
    def __init__(self):
        self.added = []

    def add(self, item):
        self.added.append(item)

    def add_all(self, items):
        self.added.extend(items)

    async def flush(self):
        pass

    async def execute(self, *args, **kwargs):
        class FakeResult:
            def scalar_one_or_none(self):
                return None
        return FakeResult()


@pytest.mark.asyncio
async def test_staff_default_availability_matches_legacy_seed():
    tenant_id = uuid.uuid4()
    staff_id = uuid.uuid4()
    session = AvailabilitySession()

    await StaffService(session)._create_default_availability(tenant_id, staff_id)

    assert len(session.added) == 7
    assert [schedule.day_of_week for schedule in session.added] == [0, 1, 2, 3, 4, 5, 6]
    assert all(schedule.tenant_id == tenant_id for schedule in session.added)
    assert all(schedule.staff_id == str(staff_id) for schedule in session.added)
    assert all(schedule.start_time == "09:00:00" for schedule in session.added)
    assert all(schedule.end_time == "17:00:00" for schedule in session.added)
    assert all(schedule.effective_from == date.today() for schedule in session.added)
    assert all(schedule.is_recurring and schedule.is_active for schedule in session.added)
    assert all(
        schedule.breaks == [{"start_time": "12:00:00", "end_time": "13:00:00"}]
        for schedule in session.added
    )
    assert all(schedule.slot_interval_minutes == 30 for schedule in session.added)
    assert all(schedule.buffer_time_minutes == 15 for schedule in session.added)
    assert all(schedule.concurrent_bookings_allowed == 1 for schedule in session.added)


def test_seed_schedule_builder_matches_legacy_weekday_values():
    tenant_id = uuid.uuid4()
    staff_id = str(uuid.uuid4())
    effective_from = date(2035, 1, 2)

    schedules = build_default_staff_availability(tenant_id, staff_id, effective_from)

    assert [schedule.day_of_week for schedule in schedules] == [0, 1, 2, 3, 4, 5, 6]
    assert all(schedule.tenant_id == tenant_id for schedule in schedules)
    assert all(schedule.staff_id == staff_id for schedule in schedules)
    assert all(schedule.start_time == "09:00:00" for schedule in schedules)
    assert all(schedule.end_time == "17:00:00" for schedule in schedules)
    assert all(schedule.effective_from == effective_from for schedule in schedules)
    assert all(schedule.is_recurring and schedule.is_active for schedule in schedules)
    assert all(
        schedule.breaks == [{"start_time": "12:00:00", "end_time": "13:00:00"}]
        for schedule in schedules
    )
    assert all(schedule.slot_interval_minutes == 30 for schedule in schedules)
    assert all(schedule.buffer_time_minutes == 15 for schedule in schedules)
    assert all(schedule.concurrent_bookings_allowed == 1 for schedule in schedules)
