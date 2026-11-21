"""Auth service: registration, login, token issuance."""
from __future__ import annotations

import hashlib
import secrets
from datetime import datetime, timedelta, timezone

import uuid
from typing import Optional

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
        result = await self.session.execute(select(User).where(User.email == data.email))
        user = result.scalar_one_or_none()
        if user is None:
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

    async def get_user_by_id(self, user_id: uuid.UUID) -> Optional[User]:
        result = await self.session.execute(select(User).where(User.id == user_id))
        return result.scalar_one_or_none()


    async def create_email_verification_token(self, user: "User") -> str:
        raw_token = secrets.token_urlsafe(32)
        hashed = hashlib.sha256(raw_token.encode()).hexdigest()
        user.email_verification_token = hashed
        user.email_verification_expires = datetime.now(timezone.utc) + timedelta(hours=24)
        await self.session.flush()
        await self.session.commit()
        await self.session.refresh(user)
        return raw_token

    async def verify_email(self, token: str) -> bool:
        hashed = hashlib.sha256(token.encode()).hexdigest()
        result = await self.session.execute(
            select(User).where(User.email_verification_token == hashed)
        )
        user = result.scalar_one_or_none()
        if user is None:
            return False
        if user.email_verification_expires is None or user.email_verification_expires < datetime.now(timezone.utc):
            return False
        user.email_verified = True
        user.email_verification_token = None
        user.email_verification_expires = None
        await self.session.flush()
        await self.session.commit()
        await self.session.refresh(user)
        return True


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
        )
        refresh = create_refresh_token(user_id=str(user.id), tenant_id=str(user.tenant_id))
        from app.config import settings

        return access, refresh, settings.jwt_access_token_expire_minutes * 60

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

    async def create_password_reset_token(self, email: str) -> str | None:
        """Generate a reset token for the user with the given email.

        Returns the raw token (for dev/testing) or None if user not found.
        Stores a hashed version with expiry.
        """
        result = await self.session.execute(select(User).where(User.email == email))
        user = result.scalar_one_or_none()
        if user is None or user.status != "active":
            return None

        raw_token = secrets.token_urlsafe(32)
        hashed = hashlib.sha256(raw_token.encode()).hexdigest()
        user.password_reset_token = hashed
        user.password_reset_expires = datetime.now(timezone.utc) + timedelta(hours=1)
        await self.session.flush()
        await self.session.refresh(user)
        return raw_token

    async def reset_password(self, token: str, new_password: str) -> bool:
        """Reset password using a valid reset token."""
        from app.lib.security import hash_password

        hashed = hashlib.sha256(token.encode()).hexdigest()
        result = await self.session.execute(
            select(User).where(User.password_reset_token == hashed)
        )
        user = result.scalar_one_or_none()
        if user is None:
            return False
        if user.password_reset_expires is None or user.password_reset_expires < datetime.now(timezone.utc):
            return False
        if len(new_password) < 8:
            return False

        user.password_hash = hash_password(new_password)
        user.password_reset_token = None
        user.password_reset_expires = None
        user.password_change_required = False
        await self.session.flush()
        await self.session.refresh(user)
        return True
