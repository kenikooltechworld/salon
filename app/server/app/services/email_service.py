"""Email sending service using Resend."""
from __future__ import annotations

import logging

import httpx

from app.config import settings

logger = logging.getLogger(__name__)

RESEND_URL = "https://api.resend.com/emails"


class EmailDeliveryError(RuntimeError):
    pass


async def send_email(to: str, subject: str, html: str, *, required: bool = False) -> bool:
    """Send an email via Resend. Returns True on success."""
    if not settings.resend_api_key:
        msg = "RESEND_API_KEY not configured"
        if required:
            raise EmailDeliveryError(msg)
        logger.warning("%s; email not sent to %s", msg, to)
        return False

    payload = {
        "from": settings.email_from,
        "to": [to],
        "subject": subject,
        "html": html,
    }
    headers = {"Authorization": f"Bearer {settings.resend_api_key}"}

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.post(RESEND_URL, json=payload, headers=headers)
        if resp.status_code in (200, 201):
            logger.info("Email sent to %s: %s", to, subject)
            return True
        logger.error("Resend failed (%s): %s", resp.status_code, resp.text)
        if required:
            raise EmailDeliveryError("Email provider rejected the request")
        return False
    except EmailDeliveryError:
        raise
    except Exception as exc:
        logger.error("Email send error to %s: %s", to, exc)
        if required:
            raise EmailDeliveryError("Unable to deliver email") from exc
        return False


def verification_email_html(code: str) -> str:
    return f"""
    <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px">
      <h2>Verify your email</h2>
      <p>Your verification code is:</p>
      <div style="font-size:32px;font-weight:bold;letter-spacing:8px;padding:16px;background:#f3f4f6;border-radius:8px;text-align:center">{code}</div>
      <p>This code expires in 24 hours.</p>
      <p>If you did not request this, ignore this email.</p>
    </div>
    """


def password_reset_email_html(code: str) -> str:
    return f"""
    <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px">
      <h2>Reset your password</h2>
      <p>Your password reset code is:</p>
      <div style="font-size:32px;font-weight:bold;letter-spacing:8px;padding:16px;background:#f3f4f6;border-radius:8px;text-align:center">{code}</div>
      <p>This code expires in 1 hour.</p>
      <p>If you did not request this, ignore this email.</p>
    </div>
    """


def welcome_email_html(owner_name: str, salon_name: str, login_url: str) -> str:
    safe_owner = owner_name or "there"
    safe_salon = salon_name or "your salon"
    return f"""
    <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px">
      <h2>Welcome to Kenikool, {safe_owner}!</h2>
      <p>Your salon <strong>{safe_salon}</strong> is ready.</p>
      <p>You can log in and start setting up staff, services, and bookings.</p>
      <p><a href="{login_url}" style="display:inline-block;padding:12px 18px;background:#0b6cfb;color:#fff;text-decoration:none;border-radius:8px">Go to Dashboard</a></p>
      <p style="color:#555;font-size:14px">If you did not create this account, please contact support.</p>
    </div>
    """
    return f"""
    <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:24px">
      <h2>Recover your salon account</h2>
      <p>We received a request to recover your Kenikool Salon account.</p>
      <p><a href="{link}" style="display:inline-block;padding:12px 18px;background:#0b6cfb;color:#fff;text-decoration:none;border-radius:8px">Recover account</a></p>
      <p style="color:#555;font-size:14px">Or copy this link:<br><span style="word-break:break-all">{link}</span></p>
      <p style="color:#555;font-size:14px">This link expires in {ttl_hours} hours. If you did not request this, ignore this email.</p>
    </div>
    """
