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


@router.get("/me", response_model=MeResponse)
async def me(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(db_session),
):
    controller = AuthController(session)
    return await controller.me(current_user)
