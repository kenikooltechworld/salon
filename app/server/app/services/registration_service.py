"""Registration service for two-phase salon owner registration."""
from __future__ import annotations

import hashlib
import random
import re
from datetime import datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.lib.security import hash_password
from app.lib.subdomain import generate_unique_subdomain
from app.models.temp_registration import TempRegistration
from app.models.tenant import Tenant
from app.models.user import User
from app.services.email_service import send_email, verification_email_html, welcome_email_html
from app.services.role_service import RoleService
from app.services.subscription_service import SubscriptionService

TEMP_TTL_HOURS = 24
CODE_TTL_MINUTES = 15
MAX_ATTEMPTS = 5
LOCK_MINUTES = 15


class PendingVerificationError(ValueError):
    """Raised when a registration exists but email is not yet verified."""

    def __init__(self, email: str, message: str = "Email verification pending. Please verify your email."):
        self.email = email
        super().__init__(message)


def _norm_phone(phone: str) -> str:
    return re.sub(r"[\s\-()]", "", phone.strip())


def _split_name(name: str) -> tuple[str, str]:
    parts = [p for p in name.strip().split() if p]
    if not parts:
        return "Owner", "Account"
    return parts[0], " ".join(parts[1:]) or "Account"


class RegistrationService:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def create_temp_registration(self, data: dict) -> dict:
        email = str(data["email"]).lower().strip()
        phone = _norm_phone(data["phone"])
        now = datetime.now(timezone.utc)

        existing_user = await self.session.execute(select(User).where(User.email == email))
        if existing_user.scalar_one_or_none():
            raise ValueError("Email already registered")
        existing_tenant = await self.session.execute(select(Tenant).where(Tenant.email == email))
        if existing_tenant.scalar_one_or_none():
            raise ValueError("Email already registered")

        existing_temp = await self.session.execute(select(TempRegistration).where(TempRegistration.email == email))
        temp = existing_temp.scalar_one_or_none()
        already_pending = temp is not None and temp.expires_at >= now
        if temp and temp.expires_at < now:
            await self.session.delete(temp)
            await self.session.flush()
            temp = None
            already_pending = False

        subdomain = await generate_unique_subdomain(self.session, data["salon_name"])
        code = "".join(str(random.randint(0, 9)) for _ in range(6))
        code_hash = hashlib.sha256(code.encode()).hexdigest()
        expires = now + timedelta(hours=TEMP_TTL_HOURS)
        code_expires = now + timedelta(minutes=CODE_TTL_MINUTES)
        first, last = _split_name(data["owner_name"])

        referral_code = (data.get("referral_code") or None)
        referral_tenant_id = None
        if referral_code:
            ref = await self.session.execute(
                select(Tenant.id).where(Tenant.subdomain == str(referral_code).strip().lower())
            )
            referral_tenant_id = ref.scalar_one_or_none()

        if temp is None:
            temp = TempRegistration(
                email=email,
                phone=phone,
                salon_name=data["salon_name"].strip(),
                owner_name=data["owner_name"].strip(),
                address=data["address"].strip(),
                bank_account=(data.get("bank_account") or None),
                password_hash=hash_password(data["password"]),
                subdomain=subdomain,
                verification_code_hash=code_hash,
                verification_code_expires=code_expires,
                referral_code=referral_code,
                referral_tenant_id=referral_tenant_id,
                expires_at=expires,
                attempt_count=0,
                locked_until=None,
            )
            self.session.add(temp)
        else:
            if temp.locked_until and temp.locked_until > now:
                raise ValueError("Too many failed attempts. Try again later")
            temp.phone = phone
            temp.salon_name = data["salon_name"].strip()
            temp.owner_name = data["owner_name"].strip()
            temp.address = data["address"].strip()
            temp.bank_account = data.get("bank_account") or None
            temp.password_hash = hash_password(data["password"])
            temp.subdomain = subdomain
            temp.verification_code_hash = code_hash
            temp.verification_code_expires = code_expires
            temp.referral_code = referral_code
            temp.referral_tenant_id = referral_tenant_id
            temp.expires_at = expires
            temp.attempt_count = 0
            temp.locked_until = None

        await self.session.commit()
        await self.session.refresh(temp)

        await send_email(email, "Verify your salon registration", verification_email_html(code), required=True)

        return {
            "temp_registration_id": str(temp.id),
            "email": temp.email,
            "expires_at": temp.verification_code_expires.isoformat(),
            "pending_verification": already_pending,
            "requires_verification": True,
        }

    async def verify_code(self, email: str, code: str) -> dict:
        email = email.lower().strip()
        now = datetime.now(timezone.utc)
        result = await self.session.execute(select(TempRegistration).where(TempRegistration.email == email))
        temp = result.scalar_one_or_none()
        if temp is None:
            raise ValueError("Registration not found or expired")
        if temp.expires_at < now:
            await self.session.delete(temp)
            await self.session.commit()
            raise ValueError("Registration expired. Please register again")
        if temp.locked_until and temp.locked_until > now:
            raise ValueError("Too many failed attempts. Try again later")
        if temp.verification_code_expires < now:
            raise ValueError("Verification code expired")

        code_hash = hashlib.sha256(code.encode()).hexdigest()
        if code_hash != temp.verification_code_hash:
            temp.attempt_count = (temp.attempt_count or 0) + 1
            if temp.attempt_count >= MAX_ATTEMPTS:
                temp.locked_until = now + timedelta(minutes=LOCK_MINUTES)
            await self.session.commit()
            raise ValueError("Invalid verification code")

        existing_user = await self.session.execute(select(User).where(User.email == email))
        if existing_user.scalar_one_or_none():
            await self.session.delete(temp)
            await self.session.commit()
            raise ValueError("Email already registered")

        first, last = _split_name(temp.owner_name)
        now = datetime.now(timezone.utc)
        trial_end = now + timedelta(days=30)
        tenant = Tenant(
            name=temp.salon_name,
            subdomain=temp.subdomain,
            email=temp.email,
            phone=temp.phone,
            address=temp.address,
            status="active",
            subscription_tier="trial",
            is_published=True,
            settings={
                "trial_end_date": trial_end.isoformat(),
                "owner_phone": temp.phone,
                "owner_email": temp.email,
                "referral_code": temp.referral_code,
                "referral_tenant_id": str(temp.referral_tenant_id) if temp.referral_tenant_id else None,
            },
        )
        self.session.add(tenant)
        await self.session.flush()

        await SubscriptionService.create_trial_subscription(self.session, tenant.id, trial_days=30)
        owner_role = await RoleService(self.session).get_owner_role(tenant.id)

        user = User(
            tenant_id=tenant.id,
            email=temp.email,
            password_hash=temp.password_hash,
            first_name=first,
            last_name=last,
            phone=temp.phone,
            role="owner",
            role_ids=[owner_role.id] if owner_role else [],
            email_verified=True,
            status="active",
        )
        self.session.add(user)
        await self.session.delete(temp)
        await self.session.commit()
        await self.session.refresh(user)
        await self.session.refresh(tenant)

        try:
            from app.config import settings
            domain = settings.platform_domain.strip().strip("/") or "kenikoolsalon.com"
            env = settings.environment.lower()
            login_url = f"http://{tenant.subdomain}.{domain}:3000/login" if env == "development" else f"https://{tenant.subdomain}.{domain}/login"
            await send_email(
                temp.email,
                f"Welcome to Kenikool - {tenant.name}",
                welcome_email_html(temp.owner_name, tenant.name, login_url),
                required=False,
            )
        except Exception:
            # Do not fail verified registration if welcome email cannot be delivered.
            pass

        return {
            "tenant_id": str(tenant.id),
            "subdomain": tenant.subdomain,
            "full_url": tenant.subdomain,
            "user_id": str(user.id),
        }

    async def resend_code(self, email: str) -> dict:
        email = email.lower().strip()
        now = datetime.now(timezone.utc)
        result = await self.session.execute(select(TempRegistration).where(TempRegistration.email == email))
        temp = result.scalar_one_or_none()
        if temp is None:
            raise ValueError("Registration not found or expired")
        if temp.expires_at < now:
            await self.session.delete(temp)
            await self.session.commit()
            raise ValueError("Registration expired. Please register again")
        if temp.locked_until and temp.locked_until > now:
            raise ValueError("Too many failed attempts. Try again later")

        code = "".join(str(random.randint(0, 9)) for _ in range(6))
        temp.verification_code_hash = hashlib.sha256(code.encode()).hexdigest()
        temp.verification_code_expires = now + timedelta(minutes=CODE_TTL_MINUTES)
        temp.attempt_count = 0
        temp.locked_until = None
        await self.session.commit()
        await self.session.refresh(temp)

        await send_email(email, "Your new verification code", verification_email_html(code), required=True)
        return {"expires_at": temp.verification_code_expires.isoformat()}
