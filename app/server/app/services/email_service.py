"""Email sending service using Resend."""
from __future__ import annotations

import logging

import httpx

from app.config import settings

logger = logging.getLogger(__name__)

RESEND_URL = "https://api.resend.com/emails"


async def send_email(to: str, subject: str, html: str) -> bool:
    """Send an email via Resend. Returns True on success."""
    if not settings.resend_api_key:
        logger.warning("RESEND_API_KEY not configured; email not sent to %s", to)
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
        return False
    except Exception as exc:
        logger.error("Email send error to %s: %s", to, exc)
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
