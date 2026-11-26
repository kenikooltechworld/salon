"""Paystack payment routes (subaccount registration + initialize)."""
from __future__ import annotations

import uuid
from decimal import Decimal
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.lib.deps import db_session, get_current_user
from app.models.tenant import Tenant
from app.models.user import User
from app.services.paystack_service import PaystackService

router = APIRouter(prefix="/paystack", tags=["paystack"])


# ── Paystack subaccount registration ──────────────────────────────

class SubaccountRegister(BaseModel):
    business_name: str
    settlement_bank: str
    account_number: str
    percentage_charge: float = 0.0


class SubaccountRegisterResponse(BaseModel):
    subaccount_code: str
    percentage_charge: float
    message: str


@router.post("/subaccount", response_model=SubaccountRegisterResponse)
async def register_subaccount(
    request: Request,
    data: SubaccountRegister,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(db_session),
):
    """Register a Paystack subaccount for the tenant's bank account.

    Subscribers should set percentage_charge=0 (no platform fee).
    Free users set percentage_charge=<platform fee %>, e.g. 10.
    """
    pss = PaystackService()
    try:
        result = await pss.create_subaccount(
            business_name=data.business_name,
            settlement_bank=data.settlement_bank,
            account_number=data.account_number,
            percentage_charge=data.percentage_charge,
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))

    subaccount_code = result.get("subaccount_code")
    if not subaccount_code:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Paystack did not return subaccount code")

    tenant = (await session.execute(select(Tenant).where(Tenant.id == current_user.tenant_id))).scalar_one_or_none()
    if tenant is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tenant not found")

    tenant.paystack_subaccount_code = subaccount_code
    tenant.paystack_percentage_charge = data.percentage_charge
    await session.commit()
    await session.refresh(tenant)

    return SubaccountRegisterResponse(
        subaccount_code=subaccount_code,
        percentage_charge=data.percentage_charge,
        message="Paystack subaccount registered successfully",
    )


@router.get("/subaccount", response_model=SubaccountRegisterResponse)
async def get_subaccount(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(db_session),
):
    tenant_id = current_user.tenant_id
    tenant = (await session.execute(select(Tenant).where(Tenant.id == tenant_id))).scalar_one_or_none()
    if tenant is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tenant not found")
    return SubaccountRegisterResponse(
        subaccount_code=tenant.paystack_subaccount_code or "",
        percentage_charge=tenant.paystack_percentage_charge or 0.0,
        message="Subaccount details retrieved successfully",
    )


class InitializePaymentRequest(BaseModel):
    amount: Decimal
    customer_email: str
    customer_name: str | None = None
    callback_url: str | None = None
    booking_id: str | None = None
    user_type: str = "free"  # "subscriber" or "free"


class InitializePaymentResponse(BaseModel):
    authorization_url: str
    reference: str
    access_code: str | None = None
    message: str


@router.post("/initialize", response_model=InitializePaymentResponse)
async def initialize_payment(
    data: InitializePaymentRequest,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(db_session),
):
    """Initialize a Paystack transaction for a "pay now" booking.

    Uses the tenant's registered Paystack subaccount for automatic split.
    """
    tenant_id = current_user.tenant_id
    tenant = (await session.execute(select(Tenant).where(Tenant.id == tenant_id))).scalar_one_or_none()
    if tenant is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tenant not found")

    # Amount in kobo
    amount_kobo = int(data.amount * 100)

    pss = PaystackService()

    subaccount_code = tenant.paystack_subaccount_code
    percentage_charge = tenant.paystack_percentage_charge or 0.0

    reference = f"salon_{data.booking_id or uuid.uuid4().hex[:12]}_{uuid.uuid4().hex[:8]}"

    # Determine bearer: platform pays for subscribers, subaccount pays for free users.
    # Free users: tenant's percentage_charge handles platform fee split.
    bearer = "subaccount"

    metadata: dict[str, Any] = {
        "payment_type": "booking",
        "tenant_id": str(tenant_id),
        "user_type": data.user_type,
        "customer_name": data.customer_name,
        "booking_id": data.booking_id,
        "platform_fee_percentage": percentage_charge,
    }

    try:
        tx = await pss.initialize_transaction(
            email=data.customer_email,
            amount_kobo=amount_kobo,
            reference=reference,
            callback_url=data.callback_url,
            subaccount=subaccount_code,
            bearer=bearer,
            currency="NGN",
            metadata=metadata,
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))

    authorization_url = tx.get("authorization_url")
    access_code = tx.get("access_code")
    if not authorization_url:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Paystack did not return authorization_url")

    return InitializePaymentResponse(
        authorization_url=authorization_url,
        reference=reference,
        access_code=access_code,
        message="Payment initialized successfully",
    )