"""Auth controller: HTTP handling for auth endpoints."""
from __future__ import annotations

import uuid

from fastapi import HTTPException, Request, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.lib.cookies import clear_auth_cookies, cookie_kwargs, set_auth_cookies
from app.lib.security import create_access_token, create_refresh_token, verify_token
from app.models.user import User
from app.schemas.auth import (
    ChangePasswordRequest,
    ForgotPasswordRequest,
    ForgotPasswordResponse,
    LoginRequest,
    MeResponse,
    RegisterRequest,
    RegisterResponse,
    ResetPasswordRequest,
    TenantRead,
    UserRead,
)
from app.services.auth_service import AuthService
from app.services.tenant_service import TenantService


class AuthController:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.auth_service = AuthService(session)
        self.tenant_service = TenantService()

    async def register(
        self, data: RegisterRequest, request: Request, response: Response
    ) -> RegisterResponse:
        try:
            tenant, user = await self.auth_service.register(data)
        except ValueError as exc:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc))

        await self.session.commit()

        access, refresh, _ = self._issue(user)
        set_auth_cookies(
            response,
            request,
            access_token=access,
            refresh_token=refresh,
            access_max_age=settings.jwt_access_token_expire_minutes * 60,
            refresh_max_age=settings.jwt_refresh_token_expire_days * 24 * 60 * 60,
        )

        return RegisterResponse(
            tenant=TenantRead.model_validate(tenant),
            user=UserRead.model_validate(user),
        )

    async def login(
        self, data: LoginRequest, request: Request, response: Response
    ) -> dict:
        user = await self.auth_service.authenticate(data)
        if user is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials"
            )
        access, refresh, expires_in = self._issue(user)
        set_auth_cookies(
            response,
            request,
            access_token=access,
            refresh_token=refresh,
            access_max_age=settings.jwt_access_token_expire_minutes * 60,
            refresh_max_age=settings.jwt_refresh_token_expire_days * 24 * 60 * 60,
        )
        return {"message": "Logged in successfully", "expires_in": expires_in}

    async def logout(self, request: Request, response: Response) -> dict:
        clear_auth_cookies(response, request)
        return {"message": "Logged out successfully"}

    async def refresh(self, request: Request, response: Response) -> dict:
        refresh_token = request.cookies.get("refresh_token")
        if not refresh_token:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh token not found")

        payload = verify_token(refresh_token)
        if not payload or payload.get("type") != "refresh":
            clear_auth_cookies(response, request)
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")

        try:
            user_id = uuid.UUID(str(payload.get("sub")))
            tenant_id = uuid.UUID(str(payload.get("tenant_id")))
        except (ValueError, TypeError):
            clear_auth_cookies(response, request)
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token claims")

        user = await self.auth_service.get_user_by_id(user_id)
        if user is None or user.tenant_id != tenant_id or user.status != "active":
            clear_auth_cookies(response, request)
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")

        access = create_access_token(
            user_id=str(user.id),
            tenant_id=str(user.tenant_id),
            email=user.email,
            role=user.role,
        )
        response.set_cookie(
            key="access_token",
            value=access,
            max_age=settings.jwt_access_token_expire_minutes * 60,
            **cookie_kwargs(request),
        )
        return {"message": "Token refreshed", "expires_in": settings.jwt_access_token_expire_minutes * 60}

    async def change_password(
        self, user: User, data: "ChangePasswordRequest"
    ) -> dict:
        ok = await self.auth_service.change_password(
            user, data.current_password, data.new_password
        )
        if not ok:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Current password is incorrect or new password invalid",
            )
        await self.session.commit()
        return {"message": "Password changed successfully"}

    async def forgot_password(
        self, data: "ForgotPasswordRequest", request: Request, response: Response
    ) -> "ForgotPasswordResponse":
        from app.config import settings

        token = await self.auth_service.create_password_reset_token(data.email)
        await self.session.commit()
        # Only expose token in debug mode (for testing); production sends via email
        reset_token = token if settings.debug else None
        return ForgotPasswordResponse(
            message="If the email exists, a reset link has been sent",
            reset_token=reset_token,
        )

    async def reset_password(self, data: "ResetPasswordRequest") -> dict:
        ok = await self.auth_service.reset_password(data.token, data.new_password)
        if not ok:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid or expired reset token",
            )
        await self.session.commit()
        return {"message": "Password reset successfully"}

    async def me(self, user: User) -> MeResponse:
        tenant = await self.tenant_service.get_tenant(self.session, user.tenant_id)
        if tenant is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tenant not found")
        return MeResponse(
            user=UserRead.model_validate(user),
            tenant=TenantRead.model_validate(tenant),
        )

    def _issue(self, user: User) -> tuple[str, str, int]:
        access = create_access_token(
            user_id=str(user.id),
            tenant_id=str(user.tenant_id),
            email=user.email,
            role=user.role,
        )
        refresh = create_refresh_token(user_id=str(user.id), tenant_id=str(user.tenant_id))
        return access, refresh, settings.jwt_access_token_expire_minutes * 60
