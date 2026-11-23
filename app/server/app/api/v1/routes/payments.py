"""Payment routes."""
from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.controllers.payment_controller import PaymentController
from app.lib.deps import db_session, get_current_user, require_roles
from app.models.user import User
from app.schemas.payment import PaymentCreate, PaymentListResponse, PaymentRead, PaymentUpdate

router = APIRouter(prefix="/payments", tags=["payments"])


@router.get("", response_model=PaymentListResponse)
async def list_payments(
    customer_id: uuid.UUID | None = Query(default=None),
    invoice_id: uuid.UUID | None = Query(default=None),
    status: str | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(db_session),
):
    return await PaymentController(session).list(current_user.tenant_id, customer_id=customer_id, invoice_id=invoice_id, status=status, page=page, page_size=page_size)


@router.post("", response_model=PaymentRead, status_code=status.HTTP_201_CREATED)
async def create_payment(
    data: PaymentCreate,
    current_user: User = Depends(require_roles("owner", "admin", "manager", "staff")),
    session: AsyncSession = Depends(db_session),
):
    return await PaymentController(session).create(current_user.tenant_id, data)


@router.get("/{payment_id}", response_model=PaymentRead)
async def get_payment(
    payment_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(db_session),
):
    return await PaymentController(session).get(current_user.tenant_id, payment_id)


@router.put("/{payment_id}", response_model=PaymentRead)
async def update_payment(
    payment_id: uuid.UUID,
    data: PaymentUpdate,
    current_user: User = Depends(require_roles("owner", "admin", "manager", "staff")),
    session: AsyncSession = Depends(db_session),
):
    return await PaymentController(session).update(current_user.tenant_id, payment_id, data)
