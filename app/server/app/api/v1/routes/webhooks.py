"""Paystack webhook routes."""
from __future__ import annotations

import json
import logging
import uuid
from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, HTTPException, Request, status
from sqlalchemy import select

from app.db import get_session_factory
from app.models.appointment import Appointment
from app.models.invoice import Invoice
from app.models.payment import Payment as PaymentModel
from app.services.invoice_service import InvoiceService

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/webhooks", tags=["webhooks"])


# ── Helpers ─────────────────────────────────────────────────────

def _get_paystack_service() -> Any:
    from app.services.paystack_service import PaystackService

    return PaystackService()


# ── Paystack webhook receiver ────────────────────────────────────

@router.post("/paystack")
async def handle_paystack_webhook(request: Request):
    """Handle Paystack webhook events.

    Verifies signature, processes charge.success / charge.failed /
    charge.cancelled, updates payment, invoice and appointment status.
    """
    body_bytes = await request.body()
    body_str = body_bytes.decode("utf-8")

    signature = request.headers.get("X-Paystack-Signature")
    if not signature:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing X-Paystack-Signature header",
        )

    pss = _get_paystack_service()
    if not pss.verify_webhook_signature(body_str, signature):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid webhook signature",
        )

    try:
        webhook_data = json.loads(body_str)
    except json.JSONDecodeError as exc:
        raise HTTPException(status_code=400, detail=f"Invalid JSON: {exc}")

    event = webhook_data.get("event") or ""
    data = webhook_data.get("data") or {}
    reference = data.get("reference") or ""
    logger.info(f"Valid webhook received: event={event}, reference={reference}")

    if not reference:
        logger.warning("Webhook received without reference in data")
        return {"success": True, "message": "No reference, ignored"}

    session_factory = get_session_factory()
    if session_factory is None:
        raise HTTPException(status_code=500, detail="Database not configured")

    async with session_factory() as session:
        result = await session.execute(
            select(PaymentModel).where(PaymentModel.reference == reference)
        )
        payment: PaymentModel | None = result.scalar_one_or_none()

        if payment is None:
            logger.warning(f"Payment not found for reference: {reference}")
            return {"success": True, "message": "Payment not found"}

        extracted = pss.extract_webhook_data(webhook_data)

        if event == "charge.success":
            await _handle_charge_success(payment, extracted, session)
        elif event == "charge.failed":
            await _handle_charge_failed(payment, extracted, session)
        elif event in ("charge.cancelled", "charge.abandoned"):
            await _handle_charge_cancelled(payment, extracted, session)
        elif event == "refund.success":
            await _handle_refund_success(extracted, session)
        else:
            logger.info(f"Unhandled webhook event: {event}")

    return {"success": True, "message": "Webhook processed successfully"}


# ── Event handlers ───────────────────────────────────────────────

async def _handle_charge_success(
    payment: PaymentModel,
    extracted: dict[str, Any],
    session,
) -> None:
    """Handle charge.success — mark payment, invoice and appointment."""
    logger.info(f"Processing charge.success for payment {payment.id}")

    payment.status = "success"
    payment.metadata_ = {
        **(payment.metadata_ or {}),
        "paystack_transaction_id": extracted.get("transaction_id"),
        "paystack_authorization": extracted.get("authorization"),
        "webhook_processed_at": str(extracted.get("paid_at")),
    }
    await session.flush()

    # Mark invoice paid if linked
    if payment.invoice_id:
        invoice = (
            await session.execute(select(Invoice).where(Invoice.id == payment.invoice_id))
        ).scalar_one_or_none()
        if invoice:
            try:
                await InvoiceService(session).mark_paid(
                    payment.tenant_id, invoice.id
                )
                logger.info(f"Invoice {invoice.id} marked as paid")
            except Exception as exc:  # pragma: no cover
                logger.error(f"Failed to mark invoice {invoice.id} paid: {exc}")

    # Mark appointment paid if booking metadata carries appointment id
    metadata = payment.metadata_ or {}
    booking_meta = metadata.get("booking_meta") or {}
    appointment_id = booking_meta.get("appointment_id") or metadata.get("appointment_id")
    if appointment_id:
        try:
            appt_id = uuid.UUID(str(appointment_id))
        except (ValueError, TypeError):
            appt_id = None
        if appt_id is not None:
            appt = (
                await session.execute(
                    select(Appointment).where(Appointment.id == appt_id)
                )
            ).scalar_one_or_none()
            if appt:
                appt.payment_status = "paid"
                appt.payment_id = str(payment.id)
                logger.info(f"Appointment {appt.id} marked as paid")

    await session.commit()


async def _handle_charge_failed(
    payment: PaymentModel,
    extracted: dict[str, Any],
    session,
) -> None:
    """Handle charge.failed — mark payment as failed."""
    logger.info(f"Processing charge.failed for payment {payment.id}")

    payment.status = "failed"
    payment.metadata_ = {
        **(payment.metadata_ or {}),
        "failure_reason": extracted.get("failure_reason")
        or extracted.get("gateway_response"),
        "paystack_transaction_id": extracted.get("transaction_id"),
        "webhook_processed_at": str(extracted.get("paid_at")),
    }
    await session.commit()


async def _handle_charge_cancelled(
    payment: PaymentModel,
    extracted: dict[str, Any],
    session,
) -> None:
    """Handle charge.cancelled / charge.abandoned."""
    logger.info(f"Processing charge.cancelled for payment {payment.id}")

    payment.status = "cancelled"
    payment.metadata_ = {
        **(payment.metadata_ or {}),
        "cancel_reason": extracted.get("gateway_response")
        or "Payment cancelled by user",
        "paystack_transaction_id": extracted.get("transaction_id"),
        "webhook_processed_at": str(extracted.get("paid_at")),
    }
    await session.commit()


async def _handle_refund_success(
    extracted: dict[str, Any],
    session,
) -> None:
    """Handle refund.success — record refund metadata on payment."""
    reference = extracted.get("reference")
    if not reference:
        logger.warning("Refund webhook received without reference")
        return

    payment = (
        await session.execute(
            select(PaymentModel).where(PaymentModel.reference == reference)
        )
    ).scalar_one_or_none()
    if not payment:
        logger.warning(f"Payment not found for refund reference: {reference}")
        return

    payment.metadata_ = {
        **(payment.metadata_ or {}),
        "refund_id": reference,
        "refund_status": "success",
        "webhook_processed_at": str(extracted.get("paid_at")),
    }
    await session.commit()
    logger.info(f"Payment {payment.id} updated with refund information")