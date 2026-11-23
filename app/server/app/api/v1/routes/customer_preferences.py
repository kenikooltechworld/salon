"""Customer preference routes."""
from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.lib.deps import db_session, get_current_user, require_roles
from app.models.user import User
from app.schemas.customer_preference import CustomerPreferenceRead, CustomerPreferenceUpdate
from app.services.customer_preference_service import CustomerPreferenceService

router = APIRouter(prefix="/customers", tags=["customer_preferences"])


@router.get("/{customer_id}/preferences", response_model=CustomerPreferenceRead)
async def get_customer_preferences(
    customer_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(db_session),
):
    svc = CustomerPreferenceService(session)
    pref = await svc.get_or_create(current_user.tenant_id, customer_id)
    if pref is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Customer not found")
    await session.commit()
    return CustomerPreferenceRead.model_validate(pref)


@router.put("/{customer_id}/preferences", response_model=CustomerPreferenceRead)
async def update_customer_preferences(
    customer_id: uuid.UUID,
    data: CustomerPreferenceUpdate,
    current_user: User = Depends(require_roles("owner", "admin", "manager", "staff")),
    session: AsyncSession = Depends(db_session),
):
    svc = CustomerPreferenceService(session)
    pref = await svc.update(current_user.tenant_id, customer_id, data)
    if pref is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Customer not found")
    await session.commit()
    return CustomerPreferenceRead.model_validate(pref)
