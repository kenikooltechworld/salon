"""Public booking routes (host/subdomain tenant context)."""
from __future__ import annotations

import uuid
from datetime import date

from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_db
from app.lib.tenant_context import resolve_tenant_from_request
from app.schemas.public_booking import (
    AvailabilityResponse,
    AvailabilitySlotRead,
    PublicBookingCreate,
    PublicBookingRead,
    PublicServiceRead,
    PublicStaffRead,
    ReviewCreate,
    ReviewRead,
    StatisticsRead,
    TestimonialRead,
)
from app.services.public_booking_service import PublicBookingService

router = APIRouter(prefix="/public", tags=["public-booking"])


async def _ctx(request: Request, session: AsyncSession):
    ctx = await resolve_tenant_from_request(request, session)
    if ctx is None:
        from fastapi import HTTPException, status
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Salon not found")
    return ctx


@router.get("/staff", response_model=list[PublicStaffRead])
async def public_staff(request: Request, service_id: uuid.UUID | None = Query(default=None), session: AsyncSession = Depends(get_db)):
    ctx = await _ctx(request, session)
    rows = await PublicBookingService(session).list_staff(ctx.tenant.id, service_id)
    return [PublicStaffRead(**r) for r in rows]


@router.get("/availability", response_model=AvailabilityResponse)
async def public_availability(
    request: Request,
    service_id: uuid.UUID = Query(...),
    staff_id: uuid.UUID = Query(...),
    booking_date: date = Query(...),
    session: AsyncSession = Depends(get_db),
):
    ctx = await _ctx(request, session)
    slots = await PublicBookingService(session).get_availability(ctx.tenant.id, service_id, staff_id, booking_date)
    return AvailabilityResponse(date=booking_date, slots=[AvailabilitySlotRead(**s) for s in slots])


@router.post("/bookings", response_model=PublicBookingRead)
async def create_public_booking(request: Request, data: PublicBookingCreate, session: AsyncSession = Depends(get_db)):
    ctx = await _ctx(request, session)
    svc = PublicBookingService(session)
    appt = await svc.create_booking(
        ctx.tenant.id,
        data,
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
        idempotency_key=request.headers.get("idempotency-key"),
    )
    return _booking_read(appt)


@router.get("/bookings/statistics", response_model=StatisticsRead)
async def public_statistics(request: Request, session: AsyncSession = Depends(get_db)):
    ctx = await _ctx(request, session)
    data = await PublicBookingService(session).get_statistics(ctx.tenant.id)
    return StatisticsRead(**data)


@router.get("/bookings/testimonials", response_model=list[TestimonialRead])
async def public_testimonials(request: Request, limit: int = Query(default=5, ge=1, le=100), session: AsyncSession = Depends(get_db)):
    ctx = await _ctx(request, session)
    data = await PublicBookingService(session).get_testimonials(ctx.tenant.id, limit)
    return [TestimonialRead(**x) for x in data]


@router.post("/bookings/reviews", response_model=ReviewRead)
async def public_review(request: Request, data: ReviewCreate, session: AsyncSession = Depends(get_db)):
    ctx = await _ctx(request, session)
    result = await PublicBookingService(session).submit_review(ctx.tenant.id, data.booking_id, data.rating, data.feedback)
    return ReviewRead(**result)


@router.get("/bookings/{booking_id}", response_model=PublicBookingRead)
async def get_public_booking(booking_id: uuid.UUID, request: Request, session: AsyncSession = Depends(get_db)):
    ctx = await _ctx(request, session)
    appt = await PublicBookingService(session).get_booking(ctx.tenant.id, booking_id)
    return _booking_read(appt)


def _booking_read(appt) -> PublicBookingRead:
    return PublicBookingRead(
        id=appt.id,
        tenant_id=appt.tenant_id,
        service_id=uuid.UUID(str(appt.service_id)),
        staff_id=uuid.UUID(str(appt.staff_id)),
        appointment_id=appt.id,
        customer_name=appt.guest_name,
        customer_email=appt.guest_email,
        customer_phone=appt.guest_phone,
        booking_date=appt.start_time.date(),
        booking_time=appt.start_time.strftime("%H:%M"),
        duration_minutes=int((appt.end_time - appt.start_time).total_seconds() // 60),
        status=appt.status,
        notes=appt.notes,
        payment_option=appt.payment_option,
        payment_status=appt.payment_status,
        created_at=appt.created_at,
        updated_at=appt.updated_at,
    )
