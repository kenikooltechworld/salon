"""Invoice routes."""
from __future__ import annotations

import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.controllers.invoice_controller import InvoiceController
from app.lib.deps import db_session, get_current_user, require_roles
from app.models.user import User
from app.schemas.invoice import InvoiceCreate, InvoiceListResponse, InvoiceRead, InvoiceUpdate

router = APIRouter(prefix="/invoices", tags=["invoices"])


@router.get("", response_model=InvoiceListResponse)
async def list_invoices(
    customer_id: uuid.UUID | None = Query(default=None),
    status: str | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(db_session),
):
    return await InvoiceController(session).list(current_user.tenant_id, customer_id=customer_id, status=status, page=page, page_size=page_size)


@router.post("", response_model=InvoiceRead, status_code=status.HTTP_201_CREATED)
async def create_invoice(
    data: InvoiceCreate,
    current_user: User = Depends(require_roles("owner", "admin", "manager", "staff")),
    session: AsyncSession = Depends(db_session),
):
    return await InvoiceController(session).create(current_user.tenant_id, data)


@router.get("/{invoice_id}", response_model=InvoiceRead)
async def get_invoice(
    invoice_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(db_session),
):
    return await InvoiceController(session).get(current_user.tenant_id, invoice_id)


@router.put("/{invoice_id}", response_model=InvoiceRead)
async def update_invoice(
    invoice_id: uuid.UUID,
    data: InvoiceUpdate,
    current_user: User = Depends(require_roles("owner", "admin", "manager", "staff")),
    session: AsyncSession = Depends(db_session),
):
    return await InvoiceController(session).update(current_user.tenant_id, invoice_id, data)


@router.post("/{invoice_id}/mark-paid", response_model=InvoiceRead)
async def mark_invoice_paid(
    invoice_id: uuid.UUID,
    paid_at: datetime | None = None,
    current_user: User = Depends(require_roles("owner", "admin", "manager", "staff")),
    session: AsyncSession = Depends(db_session),
):
    return await InvoiceController(session).mark_paid(current_user.tenant_id, invoice_id, paid_at=paid_at)


@router.post("/{invoice_id}/cancel", response_model=InvoiceRead)
async def cancel_invoice(
    invoice_id: uuid.UUID,
    current_user: User = Depends(require_roles("owner", "admin", "manager", "staff")),
    session: AsyncSession = Depends(db_session),
):
    return await InvoiceController(session).cancel(current_user.tenant_id, invoice_id)
