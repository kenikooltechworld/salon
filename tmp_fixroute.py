from pathlib import Path
p = Path('app/server/app/api/v1/routes/public_booking.py')
text = p.read_text(encoding='utf-8')
# reorder: static routes before /bookings/{booking_id}
old = '''@router.post("/bookings", response_model=PublicBookingRead)
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


@router.get("/bookings/{booking_id}", response_model=PublicBookingRead)
async def get_public_booking(booking_id: uuid.UUID, request: Request, session: AsyncSession = Depends(get_db)):
    ctx = await _ctx(request, session)
    appt = await PublicBookingService(session).get_booking(ctx.tenant.id, booking_id)
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
    return ReviewRead(**result)'''
new = '''@router.post("/bookings", response_model=PublicBookingRead)
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
    return _booking_read(appt)'''
if old not in text:
    print('missing')
else:
    p.write_text(text.replace(old, new), encoding='utf-8')
    print('ok')
