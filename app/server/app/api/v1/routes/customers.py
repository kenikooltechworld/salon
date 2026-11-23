"""Customer routes."""
from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.controllers.customer_controller import CustomerController
from app.lib.deps import db_session, get_current_user, require_roles
from app.models.user import User
from app.schemas.customer import CustomerCreate, CustomerListResponse, CustomerRead, CustomerUpdate

router = APIRouter(prefix="/customers", tags=["customers"])


@router.get("", response_model=CustomerListResponse)
async def list_customers(
    status: str | None = Query(default=None),
    search: str | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(db_session),
):
    controller = CustomerController(session)
    return await controller.list(
        current_user.tenant_id,
        status=status,
        search=search,
        page=page,
        page_size=page_size,
    )


@router.post("", response_model=CustomerRead, status_code=status.HTTP_201_CREATED)
async def create_customer(
    data: CustomerCreate,
    current_user: User = Depends(require_roles("owner", "admin", "manager", "staff")),
    session: AsyncSession = Depends(db_session),
):
    controller = CustomerController(session)
    return await controller.create(current_user.tenant_id, data)


@router.get("/{customer_id}", response_model=CustomerRead)
async def get_customer(
    customer_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(db_session),
):
    controller = CustomerController(session)
    return await controller.get(current_user.tenant_id, customer_id)


@router.put("/{customer_id}", response_model=CustomerRead)
async def update_customer(
    customer_id: uuid.UUID,
    data: CustomerUpdate,
    current_user: User = Depends(require_roles("owner", "admin", "manager", "staff")),
    session: AsyncSession = Depends(db_session),
):
    controller = CustomerController(session)
    return await controller.update(current_user.tenant_id, customer_id, data)


@router.delete("/{customer_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_customer(
    customer_id: uuid.UUID,
    current_user: User = Depends(require_roles("owner", "admin", "manager")),
    session: AsyncSession = Depends(db_session),
):
    controller = CustomerController(session)
    await controller.delete(current_user.tenant_id, customer_id)


@router.get("/{customer_id}/balance")
async def get_customer_balance(
    customer_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(db_session),
):
    controller = CustomerController(session)
    return await controller.get_balance(current_user.tenant_id, customer_id)


@router.put("/{customer_id}/balance")
async def update_customer_balance(
    customer_id: uuid.UUID,
    current_user: User = Depends(require_roles("owner", "admin", "manager", "staff")),
    session: AsyncSession = Depends(db_session),
):
    controller = CustomerController(session)
    return await controller.update_balance(current_user.tenant_id, customer_id)


@router.get("/{customer_id}/booking-eligibility")
async def get_customer_booking_eligibility(
    customer_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(db_session),
):
    controller = CustomerController(session)
    return await controller.booking_eligibility(current_user.tenant_id, customer_id)


@router.get("/{customer_id}/history")
async def get_customer_history(
    customer_id: uuid.UUID,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(db_session),
):
    controller = CustomerController(session)
    return await controller.get_history(current_user.tenant_id, customer_id, page=page, page_size=page_size)


@router.post("/{customer_id}/resend-portal-invitation")
async def resend_customer_portal_invitation(
    customer_id: uuid.UUID,
    current_user: User = Depends(require_roles("owner", "admin", "manager", "staff")),
    session: AsyncSession = Depends(db_session),
):
    controller = CustomerController(session)
    return await controller.resend_portal_invitation(current_user.tenant_id, customer_id)
