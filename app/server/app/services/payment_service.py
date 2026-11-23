"""Payment service."""
from __future__ import annotations

import uuid
from decimal import Decimal

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.payment import Payment
from app.schemas.payment import PaymentCreate, PaymentUpdate


class PaymentService:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def list_payments(
        self,
        tenant_id: uuid.UUID,
        *,
        customer_id: uuid.UUID | None = None,
        invoice_id: uuid.UUID | None = None,
        status: str | None = None,
        page: int = 1,
        page_size: int = 20,
    ) -> tuple[list[Payment], int]:
        stmt = select(Payment).where(Payment.tenant_id == tenant_id)
        count_stmt = select(func.count()).select_from(Payment).where(Payment.tenant_id == tenant_id)
        if customer_id:
            stmt = stmt.where(Payment.customer_id == customer_id)
            count_stmt = count_stmt.where(Payment.customer_id == customer_id)
        if invoice_id:
            stmt = stmt.where(Payment.invoice_id == invoice_id)
            count_stmt = count_stmt.where(Payment.invoice_id == invoice_id)
        if status:
            stmt = stmt.where(Payment.status == status)
            count_stmt = count_stmt.where(Payment.status == status)
        total = (await self.session.execute(count_stmt)).scalar_one()
        stmt = stmt.order_by(Payment.created_at.desc()).offset((page - 1) * page_size).limit(page_size)
        return list((await self.session.execute(stmt)).scalars().all()), total

    async def get(self, tenant_id: uuid.UUID, payment_id: uuid.UUID) -> Payment | None:
        res = await self.session.execute(select(Payment).where(Payment.id == payment_id, Payment.tenant_id == tenant_id))
        return res.scalar_one_or_none()

    async def create(self, tenant_id: uuid.UUID, data: PaymentCreate) -> Payment:
        payload = data.model_dump()
        metadata = payload.pop("metadata", {})
        payment = Payment(tenant_id=tenant_id, metadata_=metadata, **payload)
        self.session.add(payment)
        await self.session.flush()
        await self.session.refresh(payment)
        return payment

    async def update(self, tenant_id: uuid.UUID, payment_id: uuid.UUID, data: PaymentUpdate) -> Payment | None:
        payment = await self.get(tenant_id, payment_id)
        if payment is None:
            return None
        payload = data.model_dump(exclude_unset=True)
        if "metadata" in payload and payload["metadata"] is not None:
            payment.metadata_ = payload.pop("metadata")
        for k, v in payload.items():
            setattr(payment, k, v)
        await self.session.flush()
        await self.session.refresh(payment)
        return payment
