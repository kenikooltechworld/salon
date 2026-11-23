"""Invoice service."""
from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone
from decimal import Decimal

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.customer import Customer
from app.models.invoice import Invoice
from app.schemas.invoice import InvoiceCreate, InvoiceUpdate


def _compute_totals(line_items: list[dict], discount: Decimal, tax: Decimal) -> tuple[Decimal, Decimal]:
    subtotal = Decimal("0")
    for item in line_items:
        qty = Decimal(str(item.get("quantity", 1)))
        unit = Decimal(str(item.get("unit_price", 0)))
        total = item.get("total")
        line_total = Decimal(str(total)) if total is not None else qty * unit
        subtotal += line_total
    grand = subtotal - Decimal(str(discount)) + Decimal(str(tax))
    if grand < 0:
        grand = Decimal("0")
    return subtotal, grand


class InvoiceService:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def list_invoices(
        self,
        tenant_id: uuid.UUID,
        *,
        customer_id: uuid.UUID | None = None,
        status: str | None = None,
        page: int = 1,
        page_size: int = 20,
    ) -> tuple[list[Invoice], int]:
        stmt = select(Invoice).where(Invoice.tenant_id == tenant_id)
        count_stmt = select(func.count()).select_from(Invoice).where(Invoice.tenant_id == tenant_id)
        if customer_id:
            stmt = stmt.where(Invoice.customer_id == customer_id)
            count_stmt = count_stmt.where(Invoice.customer_id == customer_id)
        if status:
            stmt = stmt.where(Invoice.status == status)
            count_stmt = count_stmt.where(Invoice.status == status)
        total = (await self.session.execute(count_stmt)).scalar_one()
        stmt = stmt.order_by(Invoice.created_at.desc()).offset((page - 1) * page_size).limit(page_size)
        return list((await self.session.execute(stmt)).scalars().all()), total

    async def get(self, tenant_id: uuid.UUID, invoice_id: uuid.UUID) -> Invoice | None:
        res = await self.session.execute(select(Invoice).where(Invoice.id == invoice_id, Invoice.tenant_id == tenant_id))
        return res.scalar_one_or_none()

    async def create(self, tenant_id: uuid.UUID, data: InvoiceCreate) -> Invoice:
        items = [i.model_dump(mode="json") for i in data.line_items]
        subtotal, total = _compute_totals(items, data.discount, data.tax)
        invoice = Invoice(
            tenant_id=tenant_id,
            appointment_id=data.appointment_id,
            customer_id=data.customer_id,
            line_items=items,
            subtotal=subtotal,
            discount=Decimal(str(data.discount)),
            tax=Decimal(str(data.tax)),
            total=total,
            status="draft",
            notes=data.notes,
            due_date=data.due_date or (datetime.now(timezone.utc) + timedelta(days=30)),
        )
        self.session.add(invoice)
        await self.session.flush()
        await self._sync_customer_balance(tenant_id, invoice.customer_id)
        await self.session.refresh(invoice)
        return invoice

    async def update(self, tenant_id: uuid.UUID, invoice_id: uuid.UUID, data: InvoiceUpdate) -> Invoice | None:
        invoice = await self.get(tenant_id, invoice_id)
        if invoice is None:
            return None
        payload = data.model_dump(exclude_unset=True)
        if "status" in payload and payload["status"] is not None:
            invoice.status = payload["status"]
            if invoice.status == "paid" and invoice.paid_at is None:
                invoice.paid_at = payload.get("paid_at") or datetime.now(timezone.utc)
        if "paid_at" in payload and payload["paid_at"] is not None:
            invoice.paid_at = payload["paid_at"]
        if "notes" in payload:
            invoice.notes = payload["notes"]
        if "due_date" in payload:
            invoice.due_date = payload["due_date"]
        if "discount" in payload and payload["discount"] is not None:
            invoice.discount = Decimal(str(payload["discount"]))
        if "tax" in payload and payload["tax"] is not None:
            invoice.tax = Decimal(str(payload["tax"]))
        if any(k in payload for k in ["discount", "tax"]):
            subtotal, total = _compute_totals(invoice.line_items or [], invoice.discount, invoice.tax)
            invoice.subtotal = subtotal
            invoice.total = total
        await self.session.flush()
        await self._sync_customer_balance(tenant_id, invoice.customer_id)
        await self.session.refresh(invoice)
        return invoice

    async def _sync_customer_balance(self, tenant_id: uuid.UUID, customer_id: uuid.UUID) -> None:
        stmt = select(Invoice).where(Invoice.tenant_id == tenant_id, Invoice.customer_id == customer_id, Invoice.status.in_(["issued", "overdue"]))
        invoices = (await self.session.execute(stmt)).scalars().all()
        balance = sum((Decimal(str(inv.total or 0)) for inv in invoices), Decimal("0"))
        cust = (await self.session.execute(select(Customer).where(Customer.id == customer_id, Customer.tenant_id == tenant_id))).scalar_one_or_none()
        if cust:
            cust.outstanding_balance = balance
            await self.session.flush()

    async def mark_paid(self, tenant_id: uuid.UUID, invoice_id: uuid.UUID, paid_at: datetime | None = None) -> Invoice | None:
        invoice = await self.get(tenant_id, invoice_id)
        if invoice is None:
            return None
        invoice.status = "paid"
        invoice.paid_at = paid_at or datetime.now(timezone.utc)
        await self.session.flush()
        await self._sync_customer_balance(tenant_id, invoice.customer_id)
        await self.session.refresh(invoice)
        return invoice

    async def cancel(self, tenant_id: uuid.UUID, invoice_id: uuid.UUID) -> Invoice | None:
        invoice = await self.get(tenant_id, invoice_id)
        if invoice is None:
            return None
        invoice.status = "cancelled"
        await self.session.flush()
        await self._sync_customer_balance(tenant_id, invoice.customer_id)
        await self.session.refresh(invoice)
        return invoice
