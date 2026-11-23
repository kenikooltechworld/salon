from pathlib import Path
p = Path('app/server/app/services/public_booking_service.py')
text = p.read_text(encoding='utf-8')
old = '''    async def list_staff(self, tenant_id: uuid.UUID, service_id: uuid.UUID | None = None) -> list[dict]:
        stmt = select(Staff, User).join(User, User.id == Staff.user_id).where(Staff.tenant_id == tenant_id, Staff.status == "active", Staff.is_available_for_public_booking.is_(True))
        result = await self.session.execute(stmt)
        rows = []
        for staff, user in result.all():
            if service_id and str(service_id) not in {str(x) for x in (staff.service_ids or [])}:
                continue
            rows.append({
                "id": staff.id,
                "first_name": user.first_name,
                "last_name": user.last_name,
                "is_available_for_public_booking": staff.is_available_for_public_booking,
                "bio": staff.bio,
                "profile_image_url": staff.profile_image_url,
                "specialties": staff.specialties or [],
                "rating": float(staff.rating) if staff.rating is not None else None,
                "review_count": staff.review_count or 0,
            })
        return rows'''
new = '''    async def list_staff(self, tenant_id: uuid.UUID, service_id: uuid.UUID | None = None) -> list[dict]:
        stmt = select(Staff).where(Staff.tenant_id == tenant_id, Staff.status == "active", Staff.is_available_for_public_booking.is_(True))
        result = await self.session.execute(stmt)
        rows = []
        for staff in result.scalars().all():
            if service_id and str(service_id) not in {str(x) for x in (staff.service_ids or [])}:
                continue
            first_name, last_name = "Staff", ""
            try:
                user_id = uuid.UUID(str(staff.user_id))
            except Exception:
                user_id = None
            if user_id:
                user = (await self.session.execute(select(User).where(User.id == user_id, User.tenant_id == tenant_id))).scalar_one_or_none()
                if user:
                    first_name, last_name = user.first_name, user.last_name
            rows.append({
                "id": staff.id,
                "first_name": first_name,
                "last_name": last_name,
                "is_available_for_public_booking": staff.is_available_for_public_booking,
                "bio": staff.bio,
                "profile_image_url": staff.profile_image_url,
                "specialties": staff.specialties or [],
                "rating": float(staff.rating) if staff.rating is not None else None,
                "review_count": staff.review_count or 0,
            })
        return rows'''
if old not in text:
    print('missing')
else:
    p.write_text(text.replace(old, new), encoding='utf-8')
    print('ok')
