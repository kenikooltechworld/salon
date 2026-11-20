"""Auth routes for API v1."""
from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.controllers.auth_controller import AuthController
from app.lib.deps import db_session, get_current_user
from app.models.user import User
from app.schemas.auth import LoginRequest, MeResponse, RegisterRequest, RegisterResponse, TokenResponse

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=RegisterResponse, status_code=201)
async def register(
    data: RegisterRequest,
    session: AsyncSession = Depends(db_session),
):
    controller = AuthController(session)
    return await controller.register(data)


@router.post("/login", response_model=TokenResponse)
async def login(
    data: LoginRequest,
    session: AsyncSession = Depends(db_session),
):
    controller = AuthController(session)
    return await controller.login(data)


@router.get("/me", response_model=MeResponse)
async def me(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(db_session),
):
    controller = AuthController(session)
    return await controller.me(current_user)
