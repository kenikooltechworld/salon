"""Invoice controller."""
from __future__ import annotations

import uuid
from datetime import datetime

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.schemas.invoice import InvoiceCreate, InvoiceListResponse, InvoiceRead, InvoiceUpdate
from app.services.invoice_service import InvoiceService


class InvoiceController:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.service = InvoiceService(session)

    async def list(self, tenant_id: uuid.UUID, *, customer_id: uuid.UUID | None = None, status: str | None = None, page: int = 1, page_size: int = 20) -> InvoiceListResponse:
        items, total = await self.service.list_invoices(tenant_id, customer_id=customer_id, status=status, page=page, page_size=page_size)
        return InvoiceListResponse(invoices=[InvoiceRead.model_validate(i) for i in items], total=total, page=page, page_size=page_size)

    async def get(self, tenant_id: uuid.UUID, invoice_id: uuid.UUID) -> InvoiceRead:
        item = await self.service.get(tenant_id, invoice_id)
        if item is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invoice not found")
        return InvoiceRead.model_validate(item)

    async def create(self, tenant_id: uuid.UUID, data: InvoiceCreate) -> InvoiceRead:
        item = await self.service.create(tenant_id, data)
        await self.session.commit()
        await self.session.refresh(item)
        return InvoiceRead.model_validate(item)

    async def update(self, tenant_id: uuid.UUID, invoice_id: uuid.UUID, data: InvoiceUpdate) -> InvoiceRead:
        item = await self.service.update(tenant_id, invoice_id, data)
        if item is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invoice not found")
        await self.session.commit()
        await self.session.refresh(item)
        return InvoiceRead.model_validate(item)

    async def mark_paid(self, tenant_id: uuid.UUID, invoice_id: uuid.UUID, paid_at: datetime | None = None) -> InvoiceRead:
        item = await self.service.mark_paid(tenant_id, invoice_id, paid_at=paid_at)
        if item is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invoice not found")
        await self.session.commit()
        await self.session.refresh(item)
        return InvoiceRead.model_validate(item)

    async def cancel(self, tenant_id: uuid.UUID, invoice_id: uuid.UUID) -> InvoiceRead:
        item = await self.service.cancel(tenant_id, invoice_id)
        if item is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invoice not found")
        await self.session.commit()
        await self.session.refresh(item)
        return InvoiceRead.model_validate(item)
