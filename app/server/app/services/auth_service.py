"""Auth service: registration, login, token issuance."""
from __future__ import annotations

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


class AuthService:
    """Service for authentication and registration."""

    def __init__(self, session: AsyncSession):
        self.session = session

    async def register(self, data: RegisterRequest) -> tuple[Tenant, User]:
        # Ensure subdomain not already taken
        existing_tenant = await self.session.execute(
            select(Tenant).where(Tenant.subdomain == data.tenant.subdomain)
        )
        if existing_tenant.scalar_one_or_none() is not None:
            raise ValueError("Subdomain already taken")

        # Ensure email not already taken
        existing_user = await self.session.execute(
            select(User).where(User.email == data.user.email)
        )
        if existing_user.scalar_one_or_none() is not None:
            raise ValueError("Email already registered")

        tenant = Tenant(
            name=data.tenant.name,
            subdomain=data.tenant.subdomain,
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
        if not verify_password(data.password, user.password_hash):
            return None
        return user

    async def get_user_by_id(self, user_id: uuid.UUID) -> Optional[User]:
        result = await self.session.execute(select(User).where(User.id == user_id))
        return result.scalar_one_or_none()

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
