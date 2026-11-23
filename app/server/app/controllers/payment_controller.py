"""Payment controller."""
from __future__ import annotations

import uuid

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.schemas.payment import PaymentCreate, PaymentListResponse, PaymentRead, PaymentUpdate
from app.services.payment_service import PaymentService


class PaymentController:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.service = PaymentService(session)

    async def list(self, tenant_id: uuid.UUID, *, customer_id: uuid.UUID | None = None, invoice_id: uuid.UUID | None = None, status: str | None = None, page: int = 1, page_size: int = 20) -> PaymentListResponse:
        items, total = await self.service.list_payments(tenant_id, customer_id=customer_id, invoice_id=invoice_id, status=status, page=page, page_size=page_size)
        return PaymentListResponse(payments=[PaymentRead.model_validate(i) for i in items], total=total, page=page, page_size=page_size)

    async def get(self, tenant_id: uuid.UUID, payment_id: uuid.UUID) -> PaymentRead:
        item = await self.service.get(tenant_id, payment_id)
        if item is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Payment not found")
        return PaymentRead.model_validate(item)

    async def create(self, tenant_id: uuid.UUID, data: PaymentCreate) -> PaymentRead:
        item = await self.service.create(tenant_id, data)
        await self.session.commit()
        await self.session.refresh(item)
        return PaymentRead.model_validate(item)

    async def update(self, tenant_id: uuid.UUID, payment_id: uuid.UUID, data: PaymentUpdate) -> PaymentRead:
        item = await self.service.update(tenant_id, payment_id, data)
        if item is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Payment not found")
        await self.session.commit()
        await self.session.refresh(item)
        return PaymentRead.model_validate(item)
