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
from app.models.appointment import Appointment
from app.models.payment import Payment as PaymentModel
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
    business_name: str | None = None
    account_number: str | None = None
    settlement_bank_code: str | None = None
    settlement_bank_name: str | None = None


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
        business_name=result.get("business_name") or data.business_name,
        account_number=result.get("account_number") or data.account_number,
        settlement_bank_code=result.get("settlement_bank") or data.settlement_bank,
        settlement_bank_name=None,
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

    subaccount_code = tenant.paystack_subaccount_code
    if not subaccount_code:
        return SubaccountRegisterResponse(
            subaccount_code="",
            percentage_charge=tenant.paystack_percentage_charge or 0.0,
            message="No subaccount registered",
        )

    # Fetch full subaccount details from Paystack
    pss = PaystackService()
    try:
        paystack_data = await pss.get_subaccount(subaccount_code)
        return SubaccountRegisterResponse(
            subaccount_code=paystack_data.get("subaccount_code") or subaccount_code,
            percentage_charge=paystack_data.get("percentage_charge") or tenant.paystack_percentage_charge or 0.0,
            message="Subaccount details retrieved successfully",
            business_name=paystack_data.get("business_name"),
            account_number=paystack_data.get("account_number"),
            settlement_bank_code=paystack_data.get("settlement_bank"),  # Paystack returns bank NAME here
            settlement_bank_name=paystack_data.get("settlement_bank"),
        )
    except ValueError:
        # Fallback to stored values if Paystack call fails
        return SubaccountRegisterResponse(
            subaccount_code=subaccount_code,
            percentage_charge=tenant.paystack_percentage_charge or 0.0,
            message="Subaccount details retrieved (Paystack fetch failed)",
        )


class ResolvedAccount(BaseModel):
    account_number: str
    account_name: str
    bank_code: str | None = None
    bank_name: str | None = None


@router.get("/resolve-account", response_model=ResolvedAccount)
async def resolve_account(
    account_number: str = "",
    bank_code: str = "",
):
    """Resolve bank account details via Paystack."""
    if not account_number or not bank_code:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="account_number and bank_code are required")
    pss = PaystackService()
    try:
        data = await pss.resolve_account_number(account_number=account_number, bank_code=bank_code)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc))
    return ResolvedAccount(
        account_number=account_number,
        account_name=data.get("account_name") or "",
        bank_code=bank_code,
        bank_name=data.get("bank_name") or bank_code,
    )


@router.get("/banks", response_model=list[dict[str, Any]])
async def list_paystack_banks():
    """List all Paystack-supported banks."""
    pss = PaystackService()
    try:
        data = await pss.list_banks(country="nigeria")
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc))
    return data


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

    # Persist a pending Payment row so the webhook can locate it by reference.
    payment = PaymentModel(
        tenant_id=tenant_id,
        amount=data.amount,
        status="pending",
        reference=reference,
        gateway="paystack",
        payment_method="paystack",
        metadata_={
            "appointment_id": data.booking_id,
            "user_type": data.user_type,
            "customer_email": data.customer_email,
            "customer_name": data.customer_name,
        },
    )
    session.add(payment)
    await session.flush()

    # Default callback_url to configured Paystack callback URL.
    callback_url = data.callback_url or settings.paystack_callback_url

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
            callback_url=callback_url,
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


@router.get("/verify")
async def verify_payment(
    reference: str,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(db_session),
):
    """Verify a Paystack transaction and update local Payment/Appointment status."""
    pss = PaystackService()
    try:
        tx = await pss.verify_transaction(reference)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))

    result = await session.execute(
        select(PaymentModel).where(PaymentModel.reference == reference, PaymentModel.tenant_id == current_user.tenant_id)
    )
    payment = result.scalar_one_or_none()
    if payment is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Payment not found")

    paystack_status = (tx.get("status") or "").lower()
    if paystack_status == "success" and payment.status != "success":
        payment.status = "success"
        payment.metadata_ = {
            **(payment.metadata_ or {}),
            "paystack_transaction_id": tx.get("id") or tx.get("transaction_id"),
            "paystack_authorization": tx.get("authorization") or tx.get("authorization_url"),
            "verified_at": str(tx.get("paid_at") or tx.get("transaction_date")),
        }
        metadata = payment.metadata_ or {}
        appointment_id = metadata.get("appointment_id")
        if appointment_id:
            try:
                appt_id = uuid.UUID(str(appointment_id))
            except (ValueError, TypeError):
                appt_id = None
            if appt_id is not None:
                appt = (
                    await session.execute(select(Appointment).where(Appointment.id == appt_id))
                ).scalar_one_or_none()
                if appt:
                    appt.payment_status = "paid"
    elif paystack_status in ("failed", "cancelled", "abandoned") and payment.status not in ("failed", "cancelled"):
        payment.status = paystack_status

    await session.commit()
    return tx