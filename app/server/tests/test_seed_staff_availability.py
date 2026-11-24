import uuid
from datetime import date

from seed_staff_availability import build_default_weekday_schedules


def test_default_seed_matches_legacy_weekday_schedule():
    tenant_id = uuid.uuid4()
    staff_id = str(uuid.uuid4())
    effective_from = date(2035, 1, 2)

    schedules = build_default_weekday_schedules(tenant_id, staff_id, effective_from)

    assert [schedule.day_of_week for schedule in schedules] == [0, 1, 2, 3, 4]
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
