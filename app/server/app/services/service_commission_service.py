"""Service commission service."""
from __future__ import annotations

import uuid
from datetime import datetime, timezone
from decimal import Decimal
from typing import Sequence

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.appointment import Appointment
from app.models.service import Service
from app.models.service_commission import ServiceCommission
from app.models.staff import Staff
from app.schemas.service_commission import CommissionByService, CommissionSummary


class ServiceCommissionService:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def calculate_for_appointment(
        self, tenant_id: uuid.UUID, appointment_id: uuid.UUID
    ) -> ServiceCommission | None:
        existing = (
            await self.session.execute(
                select(ServiceCommission).where(
                    ServiceCommission.tenant_id == tenant_id,
                    ServiceCommission.appointment_id == appointment_id,
                )
            )
        ).scalar_one_or_none()
        if existing:
            return existing

        appt = (
            await self.session.execute(
                select(Appointment).where(Appointment.id == appointment_id, Appointment.tenant_id == tenant_id)
            )
        ).scalar_one_or_none()
        if appt is None or appt.status != "completed":
            return None

        try:
            staff_uuid = uuid.UUID(str(appt.staff_id))
            service_uuid = uuid.UUID(str(appt.service_id))
        except (ValueError, TypeError):
            return None

        staff = (
            await self.session.execute(
                select(Staff).where(Staff.id == staff_uuid, Staff.tenant_id == tenant_id)
            )
        ).scalar_one_or_none()
        service = (
            await self.session.execute(
                select(Service).where(Service.id == service_uuid, Service.tenant_id == tenant_id)
            )
        ).scalar_one_or_none()
        if staff is None or service is None:
            return None

        service_price = appt.price if appt.price is not None else service.price
        pct = service.commission_percentage if service.commission_percentage is not None else (staff.payment_rate or Decimal("0"))
        amount = (Decimal(str(service_price)) * Decimal(str(pct)) / Decimal("100")).quantize(Decimal("0.01"))

        commission = ServiceCommission(
            tenant_id=tenant_id,
            staff_id=staff_uuid,
            appointment_id=appointment_id,
            service_id=service_uuid,
            service_price=Decimal(str(service_price)),
            commission_percentage=Decimal(str(pct)),
            commission_amount=amount,
            status="pending",
            earned_date=datetime.now(timezone.utc),
        )
        self.session.add(commission)
        await self.session.flush()
        await self.session.refresh(commission)
        return commission

    async def list_staff_commissions(
        self,
        tenant_id: uuid.UUID,
        staff_id: uuid.UUID,
        *,
        status_filter: str | None = None,
        start_date: datetime | None = None,
        end_date: datetime | None = None,
        page: int = 1,
        page_size: int = 20,
    ) -> tuple[Sequence[ServiceCommission], int]:
        stmt = select(ServiceCommission).where(
            ServiceCommission.tenant_id == tenant_id, ServiceCommission.staff_id == staff_id
        )
        count_stmt = select(func.count()).select_from(ServiceCommission).where(
            ServiceCommission.tenant_id == tenant_id, ServiceCommission.staff_id == staff_id
        )
        if status_filter:
            stmt = stmt.where(ServiceCommission.status == status_filter)
            count_stmt = count_stmt.where(ServiceCommission.status == status_filter)
        if start_date:
            stmt = stmt.where(ServiceCommission.earned_date >= start_date)
            count_stmt = count_stmt.where(ServiceCommission.earned_date >= start_date)
        if end_date:
            stmt = stmt.where(ServiceCommission.earned_date <= end_date)
            count_stmt = count_stmt.where(ServiceCommission.earned_date <= end_date)
        total = (await self.session.execute(count_stmt)).scalar_one()
        stmt = stmt.order_by(ServiceCommission.earned_date.desc()).offset((page - 1) * page_size).limit(page_size)
        result = await self.session.execute(stmt)
        return result.scalars().all(), total

    async def summary(
        self, tenant_id: uuid.UUID, staff_id: uuid.UUID, start_date: datetime | None = None, end_date: datetime | None = None
    ) -> tuple[CommissionSummary, list[CommissionByService]]:
        stmt = select(ServiceCommission).where(
            ServiceCommission.tenant_id == tenant_id, ServiceCommission.staff_id == staff_id
        )
        if start_date:
            stmt = stmt.where(ServiceCommission.earned_date >= start_date)
        if end_date:
            stmt = stmt.where(ServiceCommission.earned_date <= end_date)
        rows = (await self.session.execute(stmt)).scalars().all()

        total_earned = Decimal("0")
        total_pending = Decimal("0")
        total_paid = Decimal("0")
        by_service: dict[uuid.UUID, dict] = {}
        for c in rows:
            total_earned += c.commission_amount
            if c.status == "paid":
                total_paid += c.commission_amount
            else:
                total_pending += c.commission_amount
            entry = by_service.setdefault(c.service_id, {"total": Decimal("0"), "count": 0})
            entry["total"] += c.commission_amount
            entry["count"] += 1

        avg = (total_earned / len(rows)).quantize(Decimal("0.01")) if rows else Decimal("0")
        summary = CommissionSummary(
            total_earned=total_earned,
            total_pending=total_pending,
            total_paid=total_paid,
            total_services=len(rows),
            average_commission=avg,
        )

        breakdown: list[CommissionByService] = []
        if by_service:
            svc_ids = list(by_service.keys())
            svc_rows = (
                await self.session.execute(
                    select(Service.id, Service.name).where(Service.tenant_id == tenant_id, Service.id.in_(svc_ids))
                )
            ).all()
            names = {sid: name for sid, name in svc_rows}
            for sid, data in by_service.items():
                breakdown.append(
                    CommissionByService(
                        service_id=sid, service_name=names.get(sid), total_commission=data["total"], count=data["count"]
                    )
                )
        return summary, breakdown

    async def mark_paid(self, tenant_id: uuid.UUID, commission_id: uuid.UUID) -> ServiceCommission | None:
        row = (
            await self.session.execute(
                select(ServiceCommission).where(
                    ServiceCommission.id == commission_id, ServiceCommission.tenant_id == tenant_id
                )
            )
        ).scalar_one_or_none()
        if row is None:
            return None
        if row.status != "paid":
            row.status = "paid"
            row.paid_date = datetime.now(timezone.utc)
            await self.session.flush()
            await self.session.refresh(row)
        return row

    async def mark_paid_batch(self, tenant_id: uuid.UUID, staff_id: uuid.UUID, commission_ids: list[uuid.UUID]) -> int:
        if not commission_ids:
            return 0
        result = await self.session.execute(
            select(ServiceCommission).where(
                ServiceCommission.tenant_id == tenant_id,
                ServiceCommission.staff_id == staff_id,
                ServiceCommission.id.in_(commission_ids),
                ServiceCommission.status == "pending",
            )
        )
        rows = result.scalars().all()
        now = datetime.now(timezone.utc)
        for row in rows:
            row.status = "paid"
            row.paid_date = now
        if rows:
            await self.session.flush()
        return len(rows)


    async def get_pending_commissions(self, tenant_id: uuid.UUID, staff_id: uuid.UUID) -> tuple[Sequence[ServiceCommission], Decimal]:
        stmt = (
            select(ServiceCommission)
            .where(
                ServiceCommission.tenant_id == tenant_id,
                ServiceCommission.staff_id == staff_id,
                ServiceCommission.status == "pending",
            )
            .order_by(ServiceCommission.earned_date.desc())
        )
        items = (await self.session.execute(stmt)).scalars().all()
        total = sum((Decimal(str(i.commission_amount)) for i in items), Decimal("0"))
        return items, total

    async def enrich_commissions(self, tenant_id: uuid.UUID, items: Sequence[ServiceCommission]) -> list:
        from app.schemas.service_commission import ServiceCommissionRead
        svc_ids = list({i.service_id for i in items})
        staff_ids = list({i.staff_id for i in items})
        svc_names: dict[uuid.UUID, str] = {}
        staff_names: dict[uuid.UUID, str] = {}
        if svc_ids:
            rows = (await self.session.execute(select(Service.id, Service.name).where(Service.tenant_id == tenant_id, Service.id.in_(svc_ids)))).all()
            svc_names = {sid: name for sid, name in rows}
        if staff_ids:
            rows = (await self.session.execute(select(Staff.id, Staff.first_name, Staff.last_name, Staff.email).where(Staff.tenant_id == tenant_id, Staff.id.in_(staff_ids)))).all()
            for sid, fn, ln, email in rows:
                staff_names[sid] = " ".join([x for x in [fn, ln] if x]) or email or str(sid)
        out = []
        for i in items:
            d = ServiceCommissionRead.model_validate(i).model_dump()
            d["service_name"] = svc_names.get(i.service_id)
            d["staff_name"] = staff_names.get(i.staff_id)
            out.append(ServiceCommissionRead(**d))
        return out
