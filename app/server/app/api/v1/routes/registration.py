"""Registration routes for two-phase salon owner registration."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.controllers.auth_controller import AuthController
from app.lib.cookies import set_auth_cookies
from app.lib.deps import db_session
from app.lib.rate_limit import enforce_rate_limit
from app.schemas.auth import RegisterResponse as LegacyRegisterResponse
from app.schemas.registration import (
    RegisterRequest,
    RegisterResponse,
    ResendCodeRequest,
    ResendCodeResponse,
    VerifyCodeRequest,
    VerifyCodeResponse,
)
from app.services.email_service import EmailDeliveryError
from app.services.registration_service import RegistrationService

router = APIRouter(prefix="/auth", tags=["registration"])


@router.post("/register", response_model=RegisterResponse)
async def register(
    data: RegisterRequest,
    request: Request,
    session: AsyncSession = Depends(db_session),
):
    enforce_rate_limit(request, "reg:register", limit=5, window_seconds=600)
    enforce_rate_limit(request, "reg:register:email", limit=3, window_seconds=3600, identifier=str(data.email).lower())
    service = RegistrationService(session)
    try:
        result = await service.create_temp_registration(data.model_dump())
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))
    except EmailDeliveryError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Unable to send verification email. Please try again.") from exc
    message = "Verification code sent to your email"
    if result.get("pending_verification"):
        message = "Email already pending verification. A new verification code has been sent."
    return RegisterResponse(success=True, message=message, data=result)


@router.post("/verify-code", response_model=VerifyCodeResponse)
async def verify_code(
    data: VerifyCodeRequest,
    request: Request,
    response: Response,
    session: AsyncSession = Depends(db_session),
):
    enforce_rate_limit(request, "reg:verify", limit=10, window_seconds=600)
    enforce_rate_limit(request, "reg:verify:email", limit=10, window_seconds=600, identifier=str(data.email).lower())
    service = RegistrationService(session)
    try:
        result = await service.verify_code(data.email, data.code)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))

    # Issue auth cookies for newly created user
    from app.services.auth_service import AuthService
    import uuid
    auth = AuthService(session)
    user = await auth.get_user_by_id(uuid.UUID(result["user_id"]))
    if user:
        controller = AuthController(session)
        access, refresh, _ = controller._issue(user)
        set_auth_cookies(response, request, access, refresh,
                         access_max_age=60 * 60 * 24, refresh_max_age=60 * 60 * 24 * 30)
    return VerifyCodeResponse(success=True, message="Registration verified successfully", data=result)


@router.post("/resend-code", response_model=ResendCodeResponse)
async def resend_code(
    data: ResendCodeRequest,
    request: Request,
    session: AsyncSession = Depends(db_session),
):
    enforce_rate_limit(request, "reg:resend", limit=5, window_seconds=600)
    enforce_rate_limit(request, "reg:resend:email", limit=3, window_seconds=3600, identifier=str(data.email).lower())
    service = RegistrationService(session)
    try:
        result = await service.resend_code(data.email)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))
    except EmailDeliveryError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Unable to send verification email. Please try again.") from exc
    return ResendCodeResponse(success=True, message="Verification code resent", data=result)
