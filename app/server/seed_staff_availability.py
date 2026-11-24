"""Seed the legacy default weekday schedule for one tenant's active staff."""
from __future__ import annotations

import argparse
import asyncio
import uuid
from datetime import date

from sqlalchemy import select

from app.config import settings
from app.db import close_engine, get_session_factory, init_engine
from app.models.availability import Availability
from app.models.staff import Staff


def build_default_weekday_schedules(
    tenant_id: uuid.UUID,
    staff_id: str,
    effective_from: date,
) -> list[Availability]:
    """Build Monday-Friday, 9 AM-5 PM schedules with the legacy lunch break."""
    return [
        Availability(
            tenant_id=tenant_id,
            staff_id=staff_id,
            day_of_week=day_of_week,
            start_time="09:00:00",
            end_time="17:00:00",
            is_recurring=True,
            effective_from=effective_from,
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


async def seed_staff_availability(
    tenant_id: uuid.UUID,
    *,
    staff_id: uuid.UUID | None = None,
    effective_from: date | None = None,
    apply: bool = False,
) -> int:
    """Preview or seed default schedules for active staff in the given tenant."""
    if not settings.database_configured:
        raise RuntimeError("DATABASE_URL is not configured.")

    engine = init_engine()
    session_factory = get_session_factory()
    if engine is None or session_factory is None:
        raise RuntimeError("Could not initialize the database session.")

    schedule_date = effective_from or date.today()
    created_count = 0

    async with session_factory() as session:
        staff_query = select(Staff).where(
            Staff.tenant_id == tenant_id,
            Staff.status == "active",
        )
        if staff_id is not None:
            staff_query = staff_query.where(Staff.id == staff_id)

        staff_members = (await session.execute(staff_query)).scalars().all()
        if not staff_members:
            print("No matching active staff members found.")
            return 0

        existing_staff_ids = set(
            (
                await session.execute(
                    select(Availability.staff_id)
                    .where(
                        Availability.tenant_id == tenant_id,
                        Availability.is_recurring.is_(True),
                    )
                    .distinct()
                )
            ).scalars().all()
        )

        pending: list[Availability] = []
        for staff in staff_members:
            if str(staff.id) in existing_staff_ids:
                print(f"Skipping staff {staff.id}: recurring availability already exists.")
                continue

            schedules = build_default_weekday_schedules(
                tenant_id,
                str(staff.id),
                schedule_date,
            )
            pending.extend(schedules)
            print(f"{'Creating' if apply else 'Would create'} 5 weekday schedules for staff {staff.id}.")

        if not apply:
            print(f"Dry run: {len(pending)} schedules would be created. Pass --apply to write them.")
            return len(pending)

        session.add_all(pending)
        try:
            await session.commit()
        except Exception:
            await session.rollback()
            raise

        created_count = len(pending)

    print(f"Created {created_count} availability schedules.")
    return created_count


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Seed legacy default availability for active staff in one tenant."
    )
    parser.add_argument("--tenant-id", required=True, type=uuid.UUID)
    parser.add_argument("--staff-id", type=uuid.UUID, help="Limit seeding to one staff member.")
    parser.add_argument(
        "--effective-from",
        type=date.fromisoformat,
        default=date.today(),
        help="Schedule start date in YYYY-MM-DD format (default: today).",
    )
    parser.add_argument(
        "--apply",
        action="store_true",
        help="Write schedules. Without this flag, the script only previews changes.",
    )
    return parser.parse_args()


async def main() -> None:
    args = parse_args()
    try:
        await seed_staff_availability(
            args.tenant_id,
            staff_id=args.staff_id,
            effective_from=args.effective_from,
            apply=args.apply,
        )
    finally:
        await close_engine()


if __name__ == "__main__":
    asyncio.run(main())
