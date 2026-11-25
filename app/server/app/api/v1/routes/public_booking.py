"""Public booking routes (host/subdomain tenant context)."""
from __future__ import annotations

import json
import uuid
from datetime import date

from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_db
from app.lib.rate_limit import enforce_rate_limit
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
    enforce_rate_limit(request, "public:request", limit=100, window_seconds=60)
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
    enforce_rate_limit(request, "public:booking:create", limit=10, window_seconds=60, identifier=f"{ctx.tenant.id}:{request.client.host if request.client else 'unknown'}")
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
    # Extract booking metadata (addon_ids, package info) from notes JSON marker
    notes_meta: dict = {}
    notes = appt.notes or ""
    if "[booking_meta:" in notes and notes.rstrip().endswith("]"):
        try:
            start = notes.find("[booking_meta:") + len("[booking_meta:")
            end = notes.rfind("]")
            if start < end:
                notes_meta = json.loads(notes[start:end])
        except Exception:
            notes_meta = {}

    addon_ids: list[uuid.UUID] = []
    addon_names: list[str] = []
    addon_prices: list[float] = []
    for aid in notes_meta.get("addon_ids") or []:
        addon_ids.append(uuid.UUID(str(aid)))
        # resolve names/prices
    for i, aid in enumerate(notes_meta.get("addon_ids") or []):
        addon_ids.append(uuid.UUID(str(aid)))
        addon_names.append(str(notes_meta.get("addon_names", [""])[i]) if isinstance(notes_meta.get("addon_names"), list) and len(notes_meta.get("addon_names")) > i else "")
        addon_prices.append(float(notes_meta.get("addon_prices", [0])[i]) if isinstance(notes_meta.get("addon_prices"), list) and len(notes_meta.get("addon_prices")) > i else 0.0)

    service = None
    staff = None
    if notes_meta.get("service_name"):
        service = {"name": notes_meta.get("service_name")}
    if notes_meta.get("staff_name"):
        staff = {"name": notes_meta.get("staff_name")}

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
        notes=notes,
        payment_option=appt.payment_option,
        payment_status=appt.payment_status,
        addon_ids=addon_ids,
        package_id=uuid.UUID(str(notes_meta["package_id"])) if notes_meta.get("package_id") else None,
        total_price=float(appt.price or 0),
        service_name=notes_meta.get("service_name"),
        service_price=float(appt.price or 0) if notes_meta.get("service_name") else None,
        staff_name=notes_meta.get("staff_name"),
        addon_names=addon_names,
        addon_prices=addon_prices,
        package_name=notes_meta.get("package_name"),
        package_price=float(notes_meta.get("package_price", 0)) if notes_meta.get("package_name") else None,
        created_at=appt.created_at,
        updated_at=appt.updated_at,
    )
