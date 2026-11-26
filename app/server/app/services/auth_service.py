"""Auth service: registration, login, token issuance."""
from __future__ import annotations

import hashlib
import secrets
from datetime import datetime, timedelta, timezone

import uuid
from fastapi import Request

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.lib.security import (
    create_access_token,
    create_refresh_token,
    hash_password,
    verify_password,
)
from app.models.tenant import Tenant
from app.models.user import User
from app.schemas.auth import LoginRequest, RegisterRequest, UserCreate
from app.config import settings

MAX_CODE_ATTEMPTS = 5


class AuthService:
    """Service for authentication and registration."""

    def __init__(self, session: AsyncSession):
        self.session = session

    async def register(self, data: RegisterRequest) -> tuple[Tenant, User]:
        from app.lib.subdomain import generate_unique_subdomain, is_valid_subdomain

        # Generate subdomain if not provided
        requested = (data.tenant.subdomain or "").strip().lower()
        if not requested:
            subdomain = await generate_unique_subdomain(self.session, data.tenant.name)
        else:
            if not is_valid_subdomain(requested):
                raise ValueError("Invalid subdomain")
            # Ensure not already taken
            existing_tenant = await self.session.execute(
                select(Tenant).where(Tenant.subdomain == requested)
            )
            if existing_tenant.scalar_one_or_none() is not None:
                raise ValueError("Subdomain already taken")
            subdomain = requested

        # Ensure email not already taken
        existing_user = await self.session.execute(
            select(User).where(User.email == data.user.email)
        )
        if existing_user.scalar_one_or_none() is not None:
            raise ValueError("Email already registered")

        tenant = Tenant(
            name=data.tenant.name,
            subdomain=subdomain,
            email=data.tenant.email,
            description=data.tenant.description,
        )
        self.session.add(tenant)
        await self.session.flush()

        user = User(
            tenant_id=tenant.id,
            email=data.user.email,
            password_hash=hash_password(data.user.password),
            first_name=data.user.first_name,
            last_name=data.user.last_name,
            phone=data.user.phone,
            role=data.user.role,
        )
        self.session.add(user)
        await self.session.flush()
        return tenant, user

    async def authenticate(self, data: LoginRequest) -> Optional[User]:
        from app.services.registration_service import PendingVerificationError
        from app.models.temp_registration import TempRegistration

        email = str(data.email).lower().strip()
        result = await self.session.execute(select(User).where(User.email == email))
        user = result.scalar_one_or_none()
        if user is None:
            temp_result = await self.session.execute(select(TempRegistration).where(TempRegistration.email == email))
            temp = temp_result.scalar_one_or_none()
            now = datetime.now(timezone.utc)
            if temp is not None and temp.expires_at >= now:
                if temp.locked_until is not None and temp.locked_until > now:
                    raise PendingVerificationError(email, "Too many failed attempts. Try again later")
                if verify_password(data.password, temp.password_hash):
                    raise PendingVerificationError(email)
            return None
        if user.status != "active":
            return None

        now = datetime.now(timezone.utc)
        if user.locked_until is not None and user.locked_until > now:
            return None

        if not verify_password(data.password, user.password_hash):
            user.failed_login_attempts = (user.failed_login_attempts or 0) + 1
            if user.failed_login_attempts >= 5:
                user.locked_until = now + timedelta(minutes=15)
            await self.session.flush()
            await self.session.commit()
            await self.session.refresh(user)
            return None

        # success: reset counters
        user.failed_login_attempts = 0
        user.locked_until = None
        user.last_login = now
        await self.session.flush()
        await self.session.commit()
        await self.session.refresh(user)
        return user

    async def get_active_session_by_refresh(self, refresh_token: str, *, tenant_id: uuid.UUID | None = None):
        from app.lib.security import hash_token
        from app.models.session import Session
        stmt = select(Session).where(Session.refresh_token_hash == hash_token(refresh_token), Session.status == "active")
        if tenant_id:
            stmt = stmt.where(Session.tenant_id == tenant_id)
        row = (await self.session.execute(stmt)).scalar_one_or_none()
        if row is None:
            return None
        if row.expires_at < datetime.now(timezone.utc):
            row.status = "revoked"
            row.revoked_at = datetime.now(timezone.utc)
            await self.session.flush()
            return None
        return row

    async def rotate_session(self, session, *, access_token: str, csrf_token: str) -> None:
        from app.lib.security import hash_token
        session.token_hash = hash_token(access_token)
        session.csrf_token_hash = hash_token(csrf_token)
        session.expires_at = datetime.now(timezone.utc) + timedelta(minutes=settings.jwt_access_token_expire_minutes)
        await self.session.flush()

    async def revoke_session(self, session_id: str) -> bool:
        from app.models.session import Session
        try:
            sid = uuid.UUID(str(session_id))
        except Exception:
            return False
        row = (await self.session.execute(select(Session).where(Session.id == sid))).scalar_one_or_none()
        if row is None:
            return False
        row.status = "revoked"
        row.revoked_at = datetime.now(timezone.utc)
        await self.session.flush()
        await self.session.commit()
        return True


    async def create_email_verification_code(self, user: "User", *, required: bool = False) -> str:
        import random

        code = "".join(str(random.randint(0, 9)) for _ in range(6))
        hashed = hashlib.sha256(code.encode()).hexdigest()
        user.email_verification_code = hashed
        user.email_verification_expires = datetime.now(timezone.utc) + timedelta(hours=24)
        user.email_verification_attempts = 0
        await self.session.flush()
        await self.session.commit()
        await self.session.refresh(user)

        from app.services.email_service import send_email, verification_email_html

        await send_email(user.email, "Verify your email", verification_email_html(code), required=required)
        return code

    async def resend_verification_by_email(self, email: str) -> str | None:
        result = await self.session.execute(select(User).where(User.email == email))
        user = result.scalar_one_or_none()
        if user is None or user.status != "active":
            return None
        if user.email_verified:
            return ""
        return await self.create_email_verification_code(user, required=True)

    async def verify_email(self, code: str) -> bool:
        hashed = hashlib.sha256(code.encode()).hexdigest()
        result = await self.session.execute(
            select(User).where(User.email_verification_code == hashed)
        )
        user = result.scalar_one_or_none()
        if user is None:
            # increment attempts for any active user with pending code? cannot identify safely; ignore.
            return False
        if user.email_verification_expires is None or user.email_verification_expires < datetime.now(timezone.utc):
            user.email_verification_code = None
            user.email_verification_expires = None
            user.email_verification_attempts = 0
            await self.session.commit()
            return False
        if (user.email_verification_attempts or 0) >= MAX_CODE_ATTEMPTS:
            user.email_verification_code = None
            user.email_verification_expires = None
            user.email_verification_attempts = 0
            await self.session.commit()
            return False
        # correct code
        user.email_verified = True
        user.email_verification_code = None
        user.email_verification_expires = None
        user.email_verification_attempts = 0
        await self.session.flush()
        await self.session.commit()
        await self.session.refresh(user)
        return True

    async def register_invalid_email_verification_attempt(self, code: str) -> None:
        # Best-effort: if code format valid but not found, we cannot map to user; rely on rate limiting.
        return None


    async def setup_mfa(self, user: "User") -> tuple[str, str, str, list[str]]:
        from app.services.mfa_service import (
            generate_backup_codes,
            generate_qr_code,
            generate_secret,
            get_totp_uri,
            hash_backup_code,
        )

        secret = generate_secret()
        uri = get_totp_uri(secret, user.email)
        qr = generate_qr_code(uri)
        backup_codes = generate_backup_codes()
        hashed = [hash_backup_code(c) for c in backup_codes]

        user.mfa_secret = secret
        user.mfa_backup_codes = hashed
        user.mfa_method = "totp"
        await self.session.flush()
        await self.session.commit()
        await self.session.refresh(user)
        return secret, uri, qr, backup_codes

    async def verify_mfa(self, user: "User", code: str) -> bool:
        from app.services.mfa_service import verify_code

        if not user.mfa_secret:
            return False
        if not verify_code(user.mfa_secret, code):
            return False
        user.mfa_enabled = True
        await self.session.flush()
        await self.session.commit()
        await self.session.refresh(user)
        return True

    async def disable_mfa(self, user: "User", password: str, code: str) -> bool:
        from app.lib.security import verify_password
        from app.services.mfa_service import verify_code, verify_backup_code

        if not verify_password(password, user.password_hash):
            return False
        if user.mfa_secret and verify_code(user.mfa_secret, code):
            pass
        elif user.mfa_backup_codes and verify_backup_code(code, user.mfa_backup_codes):
            pass
        else:
            return False

        user.mfa_enabled = False
        user.mfa_secret = None
        user.mfa_backup_codes = None
        user.mfa_method = None
        await self.session.flush()
        await self.session.commit()
        await self.session.refresh(user)
        return True

    async def validate_mfa_login(self, email: str, code: str) -> "User | None":
        from app.services.mfa_service import verify_code, verify_backup_code

        result = await self.session.execute(select(User).where(User.email == email))
        user = result.scalar_one_or_none()
        if user is None or user.status != "active" or not user.mfa_enabled:
            return None
        if user.mfa_secret and verify_code(user.mfa_secret, code):
            return user
        if user.mfa_backup_codes and verify_backup_code(code, user.mfa_backup_codes):
            return user
        return None

    def issue_tokens(self, user: User) -> tuple[str, str, int]:
        access = create_access_token(
            user_id=str(user.id),
            tenant_id=str(user.tenant_id),
            email=user.email,
            role=user.role,
            role_ids=[str(r) for r in (user.role_ids or [])],
            permissions=[],
        )
        refresh = create_refresh_token(user_id=str(user.id), tenant_id=str(user.tenant_id))
        from app.config import settings

        return access, refresh, settings.jwt_access_token_expire_minutes * 60

    async def get_user_permissions(self, user: User) -> list[str]:
        from app.models.role import Role
        role_ids = [r for r in (user.role_ids or []) if r]
        if not role_ids:
            return []
        rows = (await self.session.execute(select(Role).where(Role.tenant_id == user.tenant_id, Role.id.in_(role_ids)))).scalars().all()
        perms: list[str] = []
        for role in rows:
            for p in (role.permissions or []):
                if p and p not in perms:
                    perms.append(str(p))
        return perms

    async def create_session(
        self,
        user: User,
        request: "Request | None",
        *,
        access_token: str,
        refresh_token: str,
        csrf_token: str,
    ):
        from app.lib.security import hash_token
        from app.models.session import Session

        ua = (request.headers.get("user-agent") if request else None) or ""
        ip = (request.client.host if request and request.client else None) or ""
        fingerprint = hashlib.sha256(f"{ua}:{ip}".encode()).hexdigest()
        expires_at = datetime.now(timezone.utc) + timedelta(minutes=settings.jwt_access_token_expire_minutes)
        session = Session(
            tenant_id=user.tenant_id,
            user_id=user.id,
            token_hash=hash_token(access_token),
            refresh_token_hash=hash_token(refresh_token),
            csrf_token_hash=hash_token(csrf_token),
            expires_at=expires_at,
            ip_address=ip[:64] or None,
            user_agent=ua[:512] or None,
            browser_fingerprint=fingerprint,
            status="active",
        )
        self.session.add(session)
        await self.session.flush()
        return session

    async def change_password(
        self, user: "User", current_password: str, new_password: str
    ) -> bool:
        from app.lib.security import hash_password, verify_password

        if not verify_password(current_password, user.password_hash):
            return False
        if len(new_password) < 8:
            return False
        user.password_hash = hash_password(new_password)
        user.password_change_required = False
        await self.session.flush()
        await self.session.refresh(user)
        return True

    async def change_password_required(self, user: "User", new_password: str) -> bool:
        from app.lib.security import hash_password

        if len(new_password) < 8:
            return False
        user.password_hash = hash_password(new_password)
        user.password_change_required = False
        await self.session.flush()
        await self.session.commit()
        await self.session.refresh(user)
        return True

    async def create_password_reset_code(self, email: str) -> str | None:
        """Generate a 6-digit reset code for the user with the given email.

        Returns the raw code (for dev/testing) or None if user not found.
        Stores a hashed version with expiry and sends an email.
        """
        import random

        result = await self.session.execute(select(User).where(User.email == email))
        user = result.scalar_one_or_none()
        if user is None or user.status != "active":
            return None

        code = "".join(str(random.randint(0, 9)) for _ in range(6))
        hashed = hashlib.sha256(code.encode()).hexdigest()
        user.password_reset_code = hashed
        user.password_reset_expires = datetime.now(timezone.utc) + timedelta(hours=1)
        user.password_reset_attempts = 0
        await self.session.flush()
        await self.session.commit()
        await self.session.refresh(user)

        from app.services.email_service import password_reset_email_html, send_email

        await send_email(user.email, "Reset your password", password_reset_email_html(code), required=True)
        return code

    async def reset_password(self, email: str, code: str, new_password: str) -> bool:
        """Reset password using a valid reset code."""
        from app.lib.security import hash_password

        hashed = hashlib.sha256(code.encode()).hexdigest()
        result = await self.session.execute(
            select(User).where(User.email == email, User.password_reset_code == hashed)
        )
        user = result.scalar_one_or_none()
        if user is None:
            # best-effort attempt tracking when email+code don't match is handled via generic rate limiting
            # but also increment attempts for pending user by email
            pending = await self.session.execute(select(User).where(User.email == email))
            pending_user = pending.scalar_one_or_none()
            if pending_user and pending_user.password_reset_code:
                pending_user.password_reset_attempts = (pending_user.password_reset_attempts or 0) + 1
                if pending_user.password_reset_attempts >= MAX_CODE_ATTEMPTS:
                    pending_user.password_reset_code = None
                    pending_user.password_reset_expires = None
                    pending_user.password_reset_attempts = 0
                await self.session.commit()
            return False
        if user.password_reset_expires is None or user.password_reset_expires < datetime.now(timezone.utc):
            user.password_reset_code = None
            user.password_reset_expires = None
            user.password_reset_attempts = 0
            await self.session.commit()
            return False
        if (user.password_reset_attempts or 0) >= MAX_CODE_ATTEMPTS:
            user.password_reset_code = None
            user.password_reset_expires = None
            user.password_reset_attempts = 0
            await self.session.commit()
            return False
        if len(new_password) < 8:
            return False

        user.password_hash = hash_password(new_password)
        user.password_reset_code = None
        user.password_reset_expires = None
        user.password_reset_attempts = 0
        user.password_change_required = False
        user.failed_login_attempts = 0
        user.locked_until = None
        await self.session.flush()
        await self.session.commit()
        await self.session.refresh(user)
        return True
