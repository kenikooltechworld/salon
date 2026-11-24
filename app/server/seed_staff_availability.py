"""Seed the legacy default availability for active staff without recurring hours."""
from __future__ import annotations

import argparse
import asyncio
import sys
import uuid
from datetime import date

from sqlalchemy import select

from app.config import settings
from app.db import close_engine, get_session_factory, init_engine
from app.models.availability import Availability
from app.models.staff import Staff
from app.services.default_availability import build_default_staff_availability


async def seed_staff_availability(*, dry_run: bool = False) -> tuple[int, int]:
    """Seed each active staff member that has no recurring availability."""
    if not settings.database_configured:
        raise RuntimeError("DATABASE_URL is not configured.")

    engine = init_engine()
    session_factory = get_session_factory()
    if engine is None or session_factory is None:
        raise RuntimeError("Could not initialize the database session.")

    async with session_factory() as session:
        staff_members = (
            await session.execute(select(Staff).where(Staff.status == "active"))
        ).scalars().all()
        existing_pairs = {
            (tenant_id, staff_id)
            for tenant_id, staff_id in (
                await session.execute(
                    select(Availability.tenant_id, Availability.staff_id)
                    .where(Availability.is_recurring.is_(True))
                    .distinct()
                )
            ).all()
        }

        pending: list[Availability] = []
        skipped_count = 0
        for staff in staff_members:
            if (staff.tenant_id, str(staff.id)) in existing_pairs:
                skipped_count += 1
                continue
            pending.extend(
                build_default_staff_availability(
                    staff.tenant_id,
                    str(staff.id),
                    date.today(),
                )
            )

        if dry_run:
            print(
                f"Dry run: {len(staff_members) - skipped_count} staff would receive "
                f"{len(pending)} schedules; {skipped_count} staff skipped."
            )
            return len(pending), skipped_count

        session.add_all(pending)
        try:
            await session.commit()
        except Exception:
            await session.rollback()
            raise

        print(
            f"Created {len(pending)} availability schedules for "
            f"{len(pending) // 5} staff; {skipped_count} staff skipped."
        )
        return len(pending), skipped_count


async def main() -> None:
    parser = argparse.ArgumentParser(
        description="Seed default weekday availability for active staff."
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Preview the schedules without writing to the database.",
    )
    args = parser.parse_args()
    try:
        await seed_staff_availability(dry_run=args.dry_run)
    finally:
        await close_engine()


if __name__ == "__main__":
    if sys.platform == "win32":
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(main())
