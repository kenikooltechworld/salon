"""Auth controller: HTTP handling for auth endpoints."""
from __future__ import annotations

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.lib.security import create_access_token, create_refresh_token
from app.models.user import User
from app.schemas.auth import (
    LoginRequest,
    MeResponse,
    RegisterRequest,
    RegisterResponse,
    TenantRead,
    TokenResponse,
    UserRead,
)
from app.services.auth_service import AuthService
from app.services.tenant_service import TenantService


class AuthController:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.auth_service = AuthService(session)
        self.tenant_service = TenantService()

    async def register(self, data: RegisterRequest) -> RegisterResponse:
        try:
            tenant, user = await self.auth_service.register(data)
        except ValueError as exc:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc))

        await self.session.commit()
        return RegisterResponse(
            tenant=TenantRead.model_validate(tenant),
            user=UserRead.model_validate(user),
        )

    async def login(self, data: LoginRequest) -> TokenResponse:
        user = await self.auth_service.authenticate(data)
        if user is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials"
            )
        access, refresh, expires_in = self.auth_service.issue_tokens(user)
        return TokenResponse(
            access_token=access,
            refresh_token=refresh,
            expires_in=expires_in,
        )

    async def me(self, user: User) -> MeResponse:
        tenant = await self.tenant_service.get_tenant(self.session, user.tenant_id)
        if tenant is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tenant not found")
        return MeResponse(
            user=UserRead.model_validate(user),
            tenant=TenantRead.model_validate(tenant),
        )
