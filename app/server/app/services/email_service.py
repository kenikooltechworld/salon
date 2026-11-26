"""Email sending service using Resend."""
from __future__ import annotations

import logging

import httpx

from app.config import settings

logger = logging.getLogger(__name__)

RESEND_URL = "https://api.resend.com/emails"
DEFAULT_PLATFORM_LOGO_URL = "https://kenikoolsalon.com/kenikool_salon_logo.png"


def _platform_logo_url() -> str:
    explicit = (getattr(settings, "platform_logo_url", "") or "").strip()
    if explicit:
        return explicit
    frontend = (settings.frontend_url or "https://kenikoolsalon.com").rstrip("/")
    return f"{frontend}/kenikool_salon_logo.png" if frontend else DEFAULT_PLATFORM_LOGO_URL


def wrap_email_html(title: str, body_html: str, *, logo_url: str | None = None, preheader: str | None = None) -> str:
    logo = (logo_url or _platform_logo_url() or "").strip()
    preheader_html = (
        f'<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent">{preheader}</div>'
        if preheader
        else ""
    )
    logo_html = (
        f'<div style="text-align:center;margin-bottom:20px"><img src="{logo}" alt="Kenikool Salon" style="max-width:180px;height:auto;display:inline-block" /></div>'
        if logo
        else ""
    )
    return f"""
    <div style="font-family:Arial,sans-serif;background:#f6f7fb;padding:24px">
      {preheader_html}
      <div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;padding:24px">
        {logo_html}
        <h2 style="margin:0 0 16px;color:#111827;font-size:24px;line-height:1.3">{title}</h2>
        <div style="color:#374151;font-size:15px;line-height:1.6">
          {body_html}
        </div>
        <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0 16px" />
        <p style="margin:0;color:#6b7280;font-size:12px;line-height:1.5;text-align:center">Kenikool Salon</p>
      </div>
    </div>
    """


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
    return wrap_email_html(
        "Verify your email",
        f"""
      <p>Your verification code is:</p>
      <div style="font-size:32px;font-weight:bold;letter-spacing:8px;padding:16px;background:#f3f4f6;border-radius:8px;text-align:center;color:#111827">{code}</div>
      <p>This code expires in 24 hours.</p>
      <p>If you did not request this, ignore this email.</p>
    """,
        preheader="Your Kenikool verification code",
    )


def password_reset_email_html(code: str) -> str:
    return wrap_email_html(
        "Reset your password",
        f"""
      <p>Your password reset code is:</p>
      <div style="font-size:32px;font-weight:bold;letter-spacing:8px;padding:16px;background:#f3f4f6;border-radius:8px;text-align:center;color:#111827">{code}</div>
      <p>This code expires in 1 hour.</p>
      <p>If you did not request this, ignore this email.</p>
    """,
        preheader="Your Kenikool password reset code",
    )


def welcome_email_html(owner_name: str, salon_name: str, login_url: str) -> str:
    safe_owner = owner_name or "there"
    safe_salon = salon_name or "your salon"
    return wrap_email_html(
        f"Welcome to Kenikool, {safe_owner}!",
        f"""
      <p>Your salon <strong>{safe_salon}</strong> is ready.</p>
      <p>You can log in and start setting up staff, services, and bookings.</p>
      <p><a href="{login_url}" style="display:inline-block;padding:12px 18px;background:#0b6cfb;color:#fff;text-decoration:none;border-radius:8px">Go to Dashboard</a></p>
      <p style="color:#555;font-size:14px">If you did not create this account, please contact support.</p>
    """,
        preheader=f"Your salon {safe_salon} is ready",
    )
def account_recovery_email_html(link: str, ttl_hours: int) -> str:
    return wrap_email_html(
        "Recover your salon account",
        f"""
      <p>We received a request to recover your Kenikool Salon account.</p>
      <p><a href="{link}" style="display:inline-block;padding:12px 18px;background:#0b6cfb;color:#fff;text-decoration:none;border-radius:8px">Recover account</a></p>
      <p style="color:#555;font-size:14px">Or copy this link:<br><span style="word-break:break-all">{link}</span></p>
      <p style="color:#555;font-size:14px">This link expires in {ttl_hours} hours. If you did not request this, ignore this email.</p>
    """,
    )
