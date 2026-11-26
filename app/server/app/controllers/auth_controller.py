"""Auth controller: HTTP handling for auth endpoints."""
from __future__ import annotations

import uuid

from fastapi import HTTPException, Request, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.lib.cookies import clear_auth_cookies, cookie_kwargs, set_auth_cookies
from app.lib.rate_limit import enforce_rate_limit
from app.lib.security import create_access_token, create_refresh_token, verify_token
from app.models.user import User
from app.schemas.auth import (
    ChangePasswordRequest,
    ChangePasswordRequiredRequest,
    ForgotPasswordRequest,
    ForgotPasswordResponse,
    LoginRequest,
    MfaDisableRequest,
    MfaSetupResponse,
    MfaValidateRequest,
    MfaVerifyRequest,
    MfaVerifyResponse,
    MeResponse,
    RecoverAccountRequest,
    RecoverAccountResponse,
    RegisterRequest,
    RegisterResponse,
    ResetPasswordRequest,
    SendVerificationRequest,
    SendVerificationResponse,
    TenantRead,
    VerifyEmailRequest,
    VerifyEmailResponse,

    UserRead,
)
from app.services.auth_service import AuthService
from app.services.email_service import EmailDeliveryError
from app.services.tenant_service import TenantService


class AuthController:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.auth_service = AuthService(session)
        self.tenant_service = TenantService()

    async def register(
        self, data: RegisterRequest, request: Request, response: Response
    ) -> RegisterResponse:
        enforce_rate_limit(request, "auth:register", limit=5, window_seconds=600)
        enforce_rate_limit(request, "auth:register:email", limit=3, window_seconds=3600, identifier=str(data.user.email).lower())
        try:
            tenant, user = await self.auth_service.register(data)
        except ValueError as exc:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc))

        try:
            await self.auth_service.create_email_verification_code(user, required=True)
        except EmailDeliveryError as exc:
            await self.session.rollback()
            raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Unable to send verification email. Please try again.") from exc

        await self._issue(user, request=request, response=response)

        return RegisterResponse(
            tenant=TenantRead.model_validate(tenant),
            user=UserRead.model_validate(user),
        )

    async def login(
        self, data: LoginRequest, request: Request, response: Response
    ) -> dict:
        from app.services.registration_service import PendingVerificationError

        enforce_rate_limit(request, "auth:login", limit=10, window_seconds=600)
        enforce_rate_limit(request, "auth:login:email", limit=10, window_seconds=600, identifier=str(data.email).lower())
        try:
            user = await self.auth_service.authenticate(data)
        except PendingVerificationError as exc:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={
                    "message": str(exc),
                    "code": "EMAIL_NOT_VERIFIED",
                    "requires_verification": True,
                    "email": exc.email,
                },
            )
        if user is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials"
            )

        # MFA required: issue short-lived pending token, do not set full cookies
        if user.mfa_enabled:
            from app.lib.security import create_access_token

            pending = create_access_token(
                user_id=str(user.id),
                tenant_id=str(user.tenant_id),
                email=user.email,
                role=user.role,
            )
            # reuse as mfa_pending by setting a dedicated cookie
            kwargs = cookie_kwargs(request)
            response.set_cookie(
                key="mfa_pending",
                value=pending,
                max_age=5 * 60,
                **kwargs,
            )
            return {"mfa_required": True, "message": "MFA required"}

        access, refresh, expires_in = await self._issue(user, request=request, response=response)
        return {
            "message": "Logged in successfully",
            "expires_in": expires_in,
            "password_change_required": bool(getattr(user, "password_change_required", False)),
        }

    async def logout(self, request: Request, response: Response) -> dict:
        session_id = request.cookies.get("session_id")
        if session_id:
            await self.auth_service.revoke_session(session_id)
        clear_auth_cookies(response, request)
        return {"message": "Logged out successfully"}

    async def refresh(self, request: Request, response: Response) -> dict:
        enforce_rate_limit(request, "auth:refresh", limit=30, window_seconds=300)
        refresh_token = request.cookies.get("refresh_token")
        if not refresh_token:
            clear_auth_cookies(response, request)
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

        session = await self.auth_service.get_active_session_by_refresh(refresh_token, tenant_id=tenant_id)
        if session is None:
            clear_auth_cookies(response, request)
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid session")

        user = await self.auth_service.get_user_by_id(user_id)
        if user is None or user.tenant_id != tenant_id or user.status != "active" or session.user_id != user.id:
            clear_auth_cookies(response, request)
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")

        permissions = await self.auth_service.get_user_permissions(user)
        role_ids = [str(r) for r in (user.role_ids or []) if r]
        access = create_access_token(
            user_id=str(user.id),
            tenant_id=str(user.tenant_id),
            email=user.email,
            role=user.role,
            role_ids=role_ids,
            permissions=permissions,
        )
        from app.lib.security import generate_csrf_token
        csrf = generate_csrf_token()
        await self.auth_service.rotate_session(session, access_token=access, csrf_token=csrf)
        await self.session.commit()
        set_auth_cookies(
            response,
            request,
            access_token=access,
            refresh_token=refresh_token,
            access_max_age=settings.jwt_access_token_expire_minutes * 60,
            refresh_max_age=settings.jwt_refresh_token_expire_days * 24 * 60 * 60,
            csrf_token=csrf,
            session_id=str(session.id),
            tenant_id=str(user.tenant_id),
            user_id=str(user.id),
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

    async def change_password_required(
        self, user: User, data: "ChangePasswordRequiredRequest"
    ) -> dict:
        if not user.password_change_required:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Password change is not required",
            )
        ok = await self.auth_service.change_password_required(user, data.new_password)
        if not ok:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid new password",
            )
        return {"message": "Password changed successfully"}

    async def forgot_password(
        self, data: "ForgotPasswordRequest", request: Request, response: Response
    ) -> "ForgotPasswordResponse":
        from app.config import settings

        enforce_rate_limit(request, "auth:forgot-password", limit=5, window_seconds=600)
        enforce_rate_limit(request, "auth:forgot-password:email", limit=3, window_seconds=3600, identifier=str(data.email).lower())
        try:
            code = await self.auth_service.create_password_reset_code(data.email)
        except EmailDeliveryError:
            # Do not reveal account existence; log already in service/email layer
            code = None
        return ForgotPasswordResponse(
            message="If the email exists, a reset code has been sent",
            reset_code=code if settings.debug else None,
        )

    async def reset_password(self, data: "ResetPasswordRequest", request: Request) -> dict:
        enforce_rate_limit(request, "auth:reset-password", limit=10, window_seconds=600)
        enforce_rate_limit(request, "auth:reset-password:email", limit=10, window_seconds=600, identifier=str(data.email).lower())
        ok = await self.auth_service.reset_password(data.email, data.code, data.new_password)
        if not ok:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid or expired reset code",
            )
        return {"message": "Password reset successfully"}

    async def send_verification(
        self, request: Request, response: Response, data: "SendVerificationRequest | None" = None, current_user: User | None = None
    ) -> "SendVerificationResponse":
        from app.config import settings

        enforce_rate_limit(request, "auth:send-verification", limit=10, window_seconds=600)
        if current_user is not None:
            enforce_rate_limit(request, "auth:send-verification:user", limit=5, window_seconds=3600, identifier=str(current_user.id))
            try:
                code = await self.auth_service.create_email_verification_code(current_user, required=True)
            except EmailDeliveryError as exc:
                raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Unable to send verification email. Please try again.") from exc
        elif data and data.email:
            enforce_rate_limit(request, "auth:send-verification:email", limit=3, window_seconds=3600, identifier=str(data.email).lower())
            try:
                code = await self.auth_service.resend_verification_by_email(data.email)
            except EmailDeliveryError as exc:
                raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Unable to send verification email. Please try again.") from exc
        else:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email or authentication required")
        return SendVerificationResponse(
            message="Verification email sent",
            verification_code=code if settings.debug and code else None,
        )

    async def verify_email(self, data: "VerifyEmailRequest", request: Request) -> "VerifyEmailResponse":
        enforce_rate_limit(request, "auth:verify-email", limit=20, window_seconds=600)
        ok = await self.auth_service.verify_email(data.code)
        if not ok:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid or expired verification code",
            )
        return VerifyEmailResponse(message="Email verified successfully", email_verified=True)

    async def mfa_setup(self, user: User) -> "MfaSetupResponse":
        from app.schemas.auth import MfaSetupResponse

        secret, uri, qr, backup_codes = await self.auth_service.setup_mfa(user)
        await self.session.commit()
        return MfaSetupResponse(
            secret=secret,
            otpauth_uri=uri,
            qr_code=qr,
            backup_codes=backup_codes,
        )

    async def mfa_verify(self, user: User, data: "MfaVerifyRequest") -> "MfaVerifyResponse":
        from app.schemas.auth import MfaVerifyResponse

        ok = await self.auth_service.verify_mfa(user, data.code)
        if not ok:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid MFA code"
            )
        await self.session.commit()
        return MfaVerifyResponse(message="MFA enabled", mfa_enabled=True)

    async def mfa_validate(
        self, data: "MfaValidateRequest", request: Request, response: Response
    ) -> dict:
        enforce_rate_limit(request, "auth:mfa-validate", limit=10, window_seconds=600)
        enforce_rate_limit(request, "auth:mfa-validate:email", limit=10, window_seconds=600, identifier=str(data.email).lower())
        user = await self.auth_service.validate_mfa_login(data.email, data.code)
        if user is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid MFA code"
            )
        # clear mfa_pending cookie
        kwargs = cookie_kwargs(request)
        response.delete_cookie(key="mfa_pending", **kwargs)

        access, refresh, expires_in = await self._issue(user, request=request, response=response)
        return {"message": "Logged in successfully", "expires_in": expires_in}

    async def mfa_disable(self, user: User, data: "MfaDisableRequest") -> dict:
        ok = await self.auth_service.disable_mfa(user, data.password, data.code)
        if not ok:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid credentials or code"
            )
        await self.session.commit()
        return {"message": "MFA disabled"}

    async def me(self, user: User) -> MeResponse:
        tenant = await self.tenant_service.get_tenant(self.session, user.tenant_id)
        if tenant is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tenant not found")
        return MeResponse(
            user=UserRead.model_validate(user),
            tenant=TenantRead.model_validate(tenant),
        )

    async def _issue(self, user: User, *, request: Request | None = None, response: Response | None = None) -> tuple[str, str, int]:
        permissions = await self.auth_service.get_user_permissions(user)
        role_ids = [str(r) for r in (user.role_ids or []) if r]
        access = create_access_token(
            user_id=str(user.id),
            tenant_id=str(user.tenant_id),
            email=user.email,
            role=user.role,
            role_ids=role_ids,
            permissions=permissions,
        )
        refresh = create_refresh_token(user_id=str(user.id), tenant_id=str(user.tenant_id))
        expires_in = settings.jwt_access_token_expire_minutes * 60
        if request is not None and response is not None:
            from app.lib.security import generate_csrf_token
            csrf = generate_csrf_token()
            session = await self.auth_service.create_session(user, request, access_token=access, refresh_token=refresh, csrf_token=csrf)
            await self.session.commit()
            set_auth_cookies(
                response,
                request,
                access_token=access,
                refresh_token=refresh,
                access_max_age=expires_in,
                refresh_max_age=settings.jwt_refresh_token_expire_days * 24 * 60 * 60,
                csrf_token=csrf,
                session_id=str(session.id),
                tenant_id=str(user.tenant_id),
                user_id=str(user.id),
            )
        return access, refresh, expires_in
