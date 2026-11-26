"""Auth routes for API v1."""
from __future__ import annotations

from fastapi import APIRouter, Depends, Request, Response
from sqlalchemy.ext.asyncio import AsyncSession

from app.controllers.auth_controller import AuthController
from app.lib.deps import db_session, get_current_user
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
    RegisterRequest,
    RegisterResponse,
    ResetPasswordRequest,
    SendVerificationRequest,
    SendVerificationResponse,
    VerifyEmailRequest,
    VerifyEmailResponse,
)
from app.schemas.registration import (
    RegisterRequest as RegistrationRegisterRequest,
    RegisterResponse as RegistrationRegisterResponse,
)

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=RegisterResponse, status_code=201)
async def register(
    data: RegisterRequest,
    request: Request,
    response: Response,
    session: AsyncSession = Depends(db_session),
):
    """
    Legacy/direct registration contract. The two-phase registration flow is also available
    at POST /auth/register with {salon_name,owner_name,email,phone,password,address,...}
    and is handled by registration_routes (included first in the v1 router).
    """
    controller = AuthController(session)
    return await controller.register(data, request, response)


@router.post("/register/direct", response_model=RegisterResponse, status_code=201)
async def register_direct(
    data: RegisterRequest,
    request: Request,
    response: Response,
    session: AsyncSession = Depends(db_session),
):
    """Explicit direct registration endpoint (legacy contract)."""
    controller = AuthController(session)
    return await controller.register(data, request, response)


@router.post("/login")
async def login(
    data: LoginRequest,
    request: Request,
    response: Response,
    session: AsyncSession = Depends(db_session),
):
    controller = AuthController(session)
    return await controller.login(data, request, response)


@router.post("/logout")
async def logout(
    request: Request,
    response: Response,
    session: AsyncSession = Depends(db_session),
):
    controller = AuthController(session)
    return await controller.logout(request, response)


@router.post("/refresh")
async def refresh(
    request: Request,
    response: Response,
    session: AsyncSession = Depends(db_session),
):
    controller = AuthController(session)
    return await controller.refresh(request, response)



@router.post("/change-password")
async def change_password(
    data: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(db_session),
):
    controller = AuthController(session)
    return await controller.change_password(current_user, data)


@router.post("/change-password-required")
async def change_password_required(
    data: ChangePasswordRequiredRequest,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(db_session),
):
    controller = AuthController(session)
    return await controller.change_password_required(current_user, data)


@router.post("/forgot-password", response_model=ForgotPasswordResponse)
async def forgot_password(
    data: ForgotPasswordRequest,
    request: Request,
    response: Response,
    session: AsyncSession = Depends(db_session),
):
    controller = AuthController(session)
    return await controller.forgot_password(data, request, response)


@router.post("/reset-password")
async def reset_password(
    data: ResetPasswordRequest,
    request: Request,
    session: AsyncSession = Depends(db_session),
):
    controller = AuthController(session)
    return await controller.reset_password(data, request)



@router.post("/send-verification", response_model=SendVerificationResponse)
async def send_verification(
    request: Request,
    response: Response,
    data: SendVerificationRequest | None = None,
    session: AsyncSession = Depends(db_session),
):
    controller = AuthController(session)
    current_user = None
    try:
        from app.lib.security import verify_token
        from app.services.auth_service import AuthService
        import uuid
        access_token = request.cookies.get("access_token")
        payload = verify_token(access_token) if access_token else None
        if payload and payload.get("type") == "access":
            uid = uuid.UUID(str(payload.get("sub")))
            current_user = await AuthService(session).get_user_by_id(uid)
    except Exception:
        current_user = None
    return await controller.send_verification(request, response, data=data, current_user=current_user)


@router.post("/verify-email", response_model=VerifyEmailResponse)
async def verify_email(
    data: VerifyEmailRequest,
    request: Request,
    session: AsyncSession = Depends(db_session),
):
    controller = AuthController(session)
    return await controller.verify_email(data, request)



@router.post("/mfa/setup", response_model=MfaSetupResponse)
async def mfa_setup(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(db_session),
):
    controller = AuthController(session)
    return await controller.mfa_setup(current_user)


@router.post("/mfa/verify", response_model=MfaVerifyResponse)
async def mfa_verify(
    data: MfaVerifyRequest,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(db_session),
):
    controller = AuthController(session)
    return await controller.mfa_verify(current_user, data)


@router.post("/mfa/validate")
async def mfa_validate(
    data: MfaValidateRequest,
    request: Request,
    response: Response,
    session: AsyncSession = Depends(db_session),
):
    controller = AuthController(session)
    return await controller.mfa_validate(data, request, response)


@router.post("/mfa/disable")
async def mfa_disable(
    data: MfaDisableRequest,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(db_session),
):
    controller = AuthController(session)
    return await controller.mfa_disable(current_user, data)



@router.put("/me")
async def update_me(
    updates: dict,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(db_session),
):
    # update allowed fields
    allowed = {"first_name", "last_name", "phone"}
    for k, v in updates.items():
        if k in allowed:
            setattr(current_user, k, v)
    await session.commit()
    await session.refresh(current_user)
    from app.services.tenant_service import TenantService

    tenant = await TenantService().get_tenant(session, current_user.tenant_id)
    from app.schemas.auth import MeResponse, TenantRead, UserRead

    return MeResponse(
        user=UserRead.model_validate(current_user),
        tenant=TenantRead.model_validate(tenant),
    )


@router.get("/csrf-token")
async def csrf_token(request: Request, response: Response):
    from app.lib.security import generate_csrf_token
    from app.lib.cookies import cookie_kwargs

    token = request.cookies.get("csrf_token") or generate_csrf_token()
    kwargs = cookie_kwargs(request)
    response.set_cookie(
        key="csrf_token",
        value=token,
        max_age=60 * 60 * 24 * 30,
        httponly=False,
        secure=kwargs.get("secure", False),
        samesite=kwargs.get("samesite", "lax"),
        path="/",
        domain=kwargs.get("domain"),
    )
    return {"csrf_token": token}


@router.get("/me", response_model=MeResponse)
async def me(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(db_session),
):
    controller = AuthController(session)
    return await controller.me(current_user)
