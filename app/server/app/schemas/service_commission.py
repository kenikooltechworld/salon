"""Schemas for service commissions."""
from __future__ import annotations

import uuid
from datetime import datetime
from decimal import Decimal
from typing import Literal, Optional

from pydantic import BaseModel, Field

CommissionStatus = Literal["pending", "paid"]


class ServiceCommissionRead(BaseModel):
    id: uuid.UUID
    tenant_id: uuid.UUID
    staff_id: uuid.UUID
    appointment_id: uuid.UUID
    service_id: uuid.UUID
    service_name: str | None = None
    staff_name: str | None = None
    service_price: Decimal
    commission_percentage: Decimal
    commission_amount: Decimal
    status: str
    earned_date: datetime
    paid_date: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class CommissionSummary(BaseModel):
    total_earned: Decimal = Decimal("0")
    total_pending: Decimal = Decimal("0")
    total_paid: Decimal = Decimal("0")
    total_services: int = 0
    average_commission: Decimal = Decimal("0")


class CommissionByService(BaseModel):
    service_id: uuid.UUID
    service_name: str | None = None
    total_commission: Decimal
    count: int


class CommissionSummaryResponse(BaseModel):
    summary: CommissionSummary
    breakdown: list[CommissionByService] = Field(default_factory=list)


class CommissionListResponse(BaseModel):
    commissions: list[ServiceCommissionRead]
    total: int
    page: int
    page_size: int
