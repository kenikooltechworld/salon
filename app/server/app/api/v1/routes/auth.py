"""Auth routes for API v1."""
from __future__ import annotations

from fastapi import APIRouter, Depends, Request, Response
from sqlalchemy.ext.asyncio import AsyncSession

from app.controllers.auth_controller import AuthController
from app.lib.deps import db_session, get_current_user
from app.models.user import User
from app.schemas.auth import (
    ChangePasswordRequest,
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
    SendVerificationResponse,
    VerifyEmailRequest,
    VerifyEmailResponse,
)

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=RegisterResponse, status_code=201)
async def register(
    data: RegisterRequest,
    request: Request,
    response: Response,
    session: AsyncSession = Depends(db_session),
):
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
    session: AsyncSession = Depends(db_session),
):
    controller = AuthController(session)
    return await controller.reset_password(data)



@router.post("/send-verification", response_model=SendVerificationResponse)
async def send_verification(
    request: Request,
    response: Response,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(db_session),
):
    controller = AuthController(session)
    return await controller.send_verification(current_user, request, response)


@router.post("/verify-email", response_model=VerifyEmailResponse)
async def verify_email(
    data: VerifyEmailRequest,
    session: AsyncSession = Depends(db_session),
):
    controller = AuthController(session)
    return await controller.verify_email(data)



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
async def csrf_token():
    from app.lib.security import generate_csrf_token

    return {"csrf_token": generate_csrf_token()}


@router.get("/me", response_model=MeResponse)
async def me(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(db_session),
):
    controller = AuthController(session)
    return await controller.me(current_user)
