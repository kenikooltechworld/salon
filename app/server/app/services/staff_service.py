"""Staff service."""
from __future__ import annotations

import secrets
import uuid
from typing import Sequence

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.service import Service
from app.models.staff import Staff
from app.models.user import User
from app.schemas.staff import StaffCreate, StaffUpdate
from app.services.default_availability import build_default_staff_availability
from app.services.tenant_service import TenantService


class StaffService:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def _attach_user_fields(self, items: Sequence[Staff]) -> list[dict]:
        user_ids: set[uuid.UUID] = set()
        for s in items:
            try:
                user_ids.add(uuid.UUID(str(s.user_id)))
            except Exception:
                pass
        users: dict[uuid.UUID, User] = {}
        if user_ids:
            rows = (await self.session.execute(select(User).where(User.id.in_(user_ids)))).scalars().all()
            users = {u.id: u for u in rows}
        out: list[dict] = []
        for s in items:
            data = {c.key: getattr(s, c.key) for c in s.__table__.columns}
            try:
                uid = uuid.UUID(str(s.user_id))
            except Exception as e:
                raise ValueError(f"Staff {s.id} has invalid user_id {s.user_id}") from e
            u = users.get(uid)
            if not u:
                raise ValueError(f"Staff {s.id} references missing user {s.user_id}")
            data["firstName"] = u.first_name
            data["lastName"] = u.last_name
            data["email"] = u.email
            data["phone"] = u.phone
            data["role_ids"] = [u.role] if u.role else []
            data["createdAt"] = s.created_at
            data["updatedAt"] = s.updated_at
            out.append(data)
        return out

    async def list_staff(self, tenant_id: uuid.UUID, *, status: str | None = None, page: int = 1, page_size: int = 20) -> tuple[list[dict], int]:
        stmt = select(Staff).where(Staff.tenant_id == tenant_id)
        count_stmt = select(func.count()).select_from(Staff).where(Staff.tenant_id == tenant_id)
        if status:
            stmt = stmt.where(Staff.status == status)
            count_stmt = count_stmt.where(Staff.status == status)
        total = (await self.session.execute(count_stmt)).scalar_one()
        stmt = stmt.order_by(Staff.created_at.desc()).offset((page - 1) * page_size).limit(page_size)
        items = (await self.session.execute(stmt)).scalars().all()
        return await self._attach_user_fields(items), total

    async def _sync_service_staff_ids(self, tenant_id: uuid.UUID, service_ids: list[str] | None, staff_id: uuid.UUID) -> None:
        new_set: set[uuid.UUID] = set()
        for sid in service_ids or []:
            try:
                new_set.add(uuid.UUID(str(sid)))
            except Exception:
                continue
        if new_set:
            rows = (await self.session.execute(select(Service).where(Service.tenant_id == tenant_id, Service.id.in_(new_set)))).scalars().all()
            for svc in rows:
                current = [uuid.UUID(str(x)) for x in (svc.staff_ids or [])]
                if staff_id not in current:
                    svc.staff_ids = list(dict.fromkeys([*current, staff_id]))
        old_rows = (await self.session.execute(select(Service).where(Service.tenant_id == tenant_id, Service.staff_ids.any(staff_id)))).scalars().all()
        for svc in old_rows:
            if svc.id not in new_set:
                svc.staff_ids = [uuid.UUID(str(x)) for x in (svc.staff_ids or []) if uuid.UUID(str(x)) != staff_id]
        await self.session.flush()

    async def _create_default_availability(self, tenant_id: uuid.UUID, staff_id: uuid.UUID) -> None:
        self.session.add_all(build_default_staff_availability(tenant_id, str(staff_id)))
        await self.session.flush()

    async def _send_welcome_email(self, tenant_id: uuid.UUID, user: User, temp_password: str) -> None:
        from app.config import settings
        from app.services.email_service import send_email

        tenant = await TenantService.get_tenant(self.session, tenant_id)
        salon_name = tenant.name if tenant else "your salon"
        salon_subdomain = tenant.subdomain if tenant else None
        login_url = f"https://{salon_subdomain}.{settings.platform_domain}/login" if salon_subdomain else f"{settings.frontend_url}/login"
        role_names = [user.role] if user.role else []
        html = f"""
        <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px">
          <h2>Welcome to {salon_name}</h2>
          <p>Hello {user.first_name},</p>
          <p>Your staff account has been created.</p>
          <p><strong>Email:</strong> {user.email}<br><strong>Temporary password:</strong> {temp_password}</p>
          <p><strong>Roles:</strong> {', '.join(role_names) if role_names else 'Staff'}</p>
          <p><a href="{login_url}">Log in to your account</a> and change your password.</p>
        </div>
        """
        await send_email(user.email, f"Welcome to {salon_name} - Staff Account Created", html, required=False)

    async def create(self, tenant_id: uuid.UUID, data: StaffCreate) -> dict:
        user: User | None = None
        temp_password: str | None = None
        if data.user_id and str(data.user_id).strip():
            try:
                uid = uuid.UUID(str(data.user_id))
            except Exception as e:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid user_id format") from e
            user = (await self.session.execute(select(User).where(User.id == uid, User.tenant_id == tenant_id))).scalar_one_or_none()
            if not user:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="User not found")
        else:
            existing = (await self.session.execute(select(User).where(User.email == data.email, User.tenant_id == tenant_id))).scalar_one_or_none()
            if existing:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"A user with email '{data.email}' already exists in your salon. Please use a different email address.")
            from app.lib.security import hash_password

            temp_password = secrets.token_urlsafe(12)
            role = (data.role_ids[0] if data.role_ids else "staff") or "staff"
            user = User(
                tenant_id=tenant_id, email=data.email, password_hash=hash_password(temp_password),
                first_name=data.firstName, last_name=data.lastName, phone=data.phone,
                role=role, status="active", password_change_required=True,
            )
            self.session.add(user)
            await self.session.flush()

        existing_staff = (await self.session.execute(select(Staff).where(Staff.user_id == str(user.id), Staff.tenant_id == tenant_id))).scalar_one_or_none()
        if existing_staff:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Staff profile already exists for this user")

        staff = Staff(
            tenant_id=tenant_id,
            user_id=str(user.id),
            specialties=data.specialties or [],
            certifications=data.certifications or [],
            certification_files=data.certification_files or [],
            payment_type=data.payment_type,
            payment_rate=data.payment_rate,
            hire_date=data.hire_date,
            bio=data.bio,
            profile_image_url=data.profile_image_url,
            status=data.status,
            is_available_for_public_booking=data.is_available_for_public_booking,
            service_ids=[str(x) for x in (data.service_ids or [])],
        )
        self.session.add(staff)
        await self.session.flush()
        await self._sync_service_staff_ids(tenant_id, data.service_ids, staff.id)
        await self._create_default_availability(tenant_id, staff.id)
        await self.session.refresh(staff)
        if temp_password:
            await self._send_welcome_email(tenant_id, user, temp_password)
        rows = await self._attach_user_fields([staff])
        return rows[0]

    async def get(self, tenant_id: uuid.UUID, staff_id: uuid.UUID) -> Staff | None:
        result = await self.session.execute(
            select(Staff).where(Staff.id == staff_id, Staff.tenant_id == tenant_id)
        )
        return result.scalar_one_or_none()

    async def get_read(self, tenant_id: uuid.UUID, staff_id: uuid.UUID) -> dict | None:
        item = await self.get(tenant_id, staff_id)
        if item is None:
            return None
        rows = await self._attach_user_fields([item])
        return rows[0] if rows else None

    async def get_by_user_id(self, tenant_id: uuid.UUID, user_id: uuid.UUID) -> dict | None:
        row = (await self.session.execute(select(Staff).where(Staff.tenant_id == tenant_id, Staff.user_id == str(user_id)))).scalar_one_or_none()
        if row is None:
            return None
        rows = await self._attach_user_fields([row])
        return rows[0] if rows else None

    async def update(self, tenant_id: uuid.UUID, staff_id: uuid.UUID, data: StaffUpdate) -> dict | None:
        staff = await self.get(tenant_id, staff_id)
        if staff is None:
            return None
        payload = data.model_dump(exclude_unset=True)
        user_fields = {k: payload.pop(k) for k in ["firstName", "lastName", "email", "phone", "role_ids"] if k in payload}
        for field, value in payload.items():
            if field == "service_ids" and value is not None:
                value = [str(x) for x in value]
            setattr(staff, field, value)
        if user_fields:
            try:
                uid = uuid.UUID(str(staff.user_id))
            except Exception as e:
                raise ValueError(f"Invalid staff user_id {staff.user_id}") from e
            user = (await self.session.execute(select(User).where(User.id == uid, User.tenant_id == tenant_id))).scalar_one_or_none()
            if user:
                if "firstName" in user_fields and user_fields["firstName"] is not None:
                    user.first_name = user_fields["firstName"]
                if "lastName" in user_fields and user_fields["lastName"] is not None:
                    user.last_name = user_fields["lastName"]
                if "email" in user_fields and user_fields["email"] is not None:
                    user.email = user_fields["email"]
                if "phone" in user_fields:
                    user.phone = user_fields["phone"]
                if "role_ids" in user_fields and user_fields["role_ids"] is not None:
                    role_ids = user_fields["role_ids"]
                    if role_ids:
                        user.role = str(role_ids[0])
        await self.session.flush()
        if "service_ids" in data.model_dump(exclude_unset=True):
            await self._sync_service_staff_ids(tenant_id, staff.service_ids or [], staff.id)
        await self.session.refresh(staff)
        rows = await self._attach_user_fields([staff])
        return rows[0]

    async def update_by_user_id(self, tenant_id: uuid.UUID, user_id: uuid.UUID, data: StaffUpdate) -> dict | None:
        row = (await self.session.execute(select(Staff).where(Staff.tenant_id == tenant_id, Staff.user_id == str(user_id)))).scalar_one_or_none()
        if row is None:
            return None
        return await self.update(tenant_id, row.id, data)

    async def delete(self, tenant_id: uuid.UUID, staff_id: uuid.UUID) -> bool:
        staff = await self.get(tenant_id, staff_id)
        if staff is None:
            return False
        staff.status = "terminated"
        await self._sync_service_staff_ids(tenant_id, [], staff.id)
        await self.session.flush()
        return True
