"""Service commission controller."""
from __future__ import annotations

import uuid
from datetime import datetime

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.schemas.notification import NotificationCreate
from app.schemas.service_commission import (
    CommissionListResponse,
    CommissionSummaryResponse,
    ServiceCommissionRead,
)
from app.services.notification_service import NotificationService
from app.services.service_commission_service import ServiceCommissionService


class ServiceCommissionController:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.service = ServiceCommissionService(session)
        self.notifications = NotificationService(session)

    async def calculate(self, tenant_id: uuid.UUID, appointment_id: uuid.UUID) -> ServiceCommissionRead:
        item = await self.service.calculate_for_appointment(tenant_id, appointment_id)
        if item is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Appointment not found or not eligible")
        await self.session.commit()
        return ServiceCommissionRead.model_validate(item)

    async def list_staff(
        self,
        tenant_id: uuid.UUID,
        staff_id: uuid.UUID,
        *,
        status_filter: str | None,
        start_date: datetime | None,
        end_date: datetime | None,
        page: int,
        page_size: int,
    ) -> CommissionListResponse:
        items, total = await self.service.list_staff_commissions(
            tenant_id,
            staff_id,
            status_filter=status_filter,
            start_date=start_date,
            end_date=end_date,
            page=page,
            page_size=page_size,
        )
        return CommissionListResponse(
            commissions=[ServiceCommissionRead.model_validate(i) for i in items],
            total=total,
            page=page,
            page_size=page_size,
        )

    async def summary(
        self, tenant_id: uuid.UUID, staff_id: uuid.UUID, start_date: datetime | None, end_date: datetime | None
    ) -> CommissionSummaryResponse:
        summary, breakdown = await self.service.summary(tenant_id, staff_id, start_date, end_date)
        return CommissionSummaryResponse(summary=summary, breakdown=breakdown)

    async def mark_paid(self, tenant_id: uuid.UUID, commission_id: uuid.UUID, actor_id: uuid.UUID | None = None) -> ServiceCommissionRead:
        item = await self.service.mark_paid(tenant_id, commission_id)
        if item is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Commission not found")
        await self.session.flush()
        if actor_id:
            await self.notifications.create(
                tenant_id,
                NotificationCreate(
                    recipient_id=actor_id,
                    notification_type="commission.paid",
                    title="Commission marked paid",
                    content=f"Commission {item.id} was marked paid.",
                    data={"commission_id": str(item.id), "staff_id": str(item.staff_id)},
                ),
            )
        else:
            await self.session.commit()
        return ServiceCommissionRead.model_validate(item)

    async def mark_paid_batch(self, tenant_id: uuid.UUID, staff_id: uuid.UUID, commission_ids: list[uuid.UUID], actor_id: uuid.UUID | None = None) -> dict:
        count = await self.service.mark_paid_batch(tenant_id, staff_id, commission_ids)
        await self.session.flush()
        if actor_id:
            await self.notifications.create(
                tenant_id,
                NotificationCreate(
                    recipient_id=actor_id,
                    notification_type="commission.batch_paid",
                    title="Commissions marked paid",
                    content=f"{count} commission(s) marked paid.",
                    data={"staff_id": str(staff_id), "updated_count": count},
                ),
            )
        else:
            await self.session.commit()
        return {"updated_count": count}

    async def pending(self, tenant_id: uuid.UUID, staff_id: uuid.UUID) -> dict:
        commissions, total_pending = await self.service.get_pending_commissions(tenant_id, staff_id)
        return {
            "commissions": [ServiceCommissionRead.model_validate(c) for c in commissions],
            "total_pending": float(total_pending),
        }
