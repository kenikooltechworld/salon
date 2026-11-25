"""Staff controller."""
from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone
from decimal import Decimal

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.appointment import Appointment
from app.models.appointment_history import AppointmentHistory
from app.models.customer import Customer
from app.models.service import Service
from app.models.service_commission import ServiceCommission
from app.models.staff import Staff
from app.models.user import User
from app.schemas.staff import StaffCreate, StaffListResponse, StaffRead, StaffUpdate
from app.services.staff_service import StaffService


class StaffController:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.service = StaffService(session)

    async def list(self, tenant_id: uuid.UUID, status: str | None = None, page: int = 1, page_size: int = 20) -> StaffListResponse:
        items, total = await self.service.list_staff(tenant_id, status=status, page=page, page_size=page_size)
        return StaffListResponse(staff=[StaffRead.model_validate(i) for i in items], total=total, page=page, page_size=page_size)

    async def create(self, tenant_id: uuid.UUID, data: StaffCreate) -> StaffRead:
        item = await self.service.create(tenant_id, data)
        await self.session.commit()
        return StaffRead.model_validate(item)

    async def get(self, tenant_id: uuid.UUID, staff_id: uuid.UUID) -> StaffRead:
        item = await self.service.get_read(tenant_id, staff_id)
        if item is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Staff not found")
        return StaffRead.model_validate(item)

    async def get_by_user(self, tenant_id: uuid.UUID, user_id: uuid.UUID) -> StaffRead:
        item = await self.service.get_by_user_id(tenant_id, user_id)
        if item is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Staff profile not found for this user")
        return StaffRead.model_validate(item)

    async def update(self, tenant_id: uuid.UUID, staff_id: uuid.UUID, data: StaffUpdate) -> StaffRead:
        item = await self.service.update(tenant_id, staff_id, data)
        if item is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Staff not found")
        await self.session.commit()
        return StaffRead.model_validate(item)

    async def update_by_user(self, tenant_id: uuid.UUID, user_id: uuid.UUID, data: StaffUpdate) -> StaffRead:
        item = await self.service.update_by_user_id(tenant_id, user_id, data)
        if item is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Staff profile not found for this user")
        await self.session.commit()
        return StaffRead.model_validate(item)

    async def delete(self, tenant_id: uuid.UUID, staff_id: uuid.UUID) -> dict:
        result = await self.service.delete(tenant_id, staff_id)
        if result is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Staff not found")
        await self.session.commit()
        if result.get("action") == "deleted":
            return {"message": "Staff member permanently deleted", **result}
        return {"message": "Staff member terminated successfully", **result}

    async def terminate(self, tenant_id: uuid.UUID, staff_id: uuid.UUID) -> dict:
        result = await self.service.terminate(tenant_id, staff_id)
        if result is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Staff not found")
        await self.session.commit()
        return {"message": "Staff member terminated successfully", **result}

    async def upload_certificate(self, tenant_id: uuid.UUID, staff_id: uuid.UUID, base64_data: str) -> dict:
        from app.services.media_service import upload_media, MediaUploadError

        staff = await self.service.get(tenant_id, staff_id)
        if not staff:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Staff member not found")
        try:
            url = upload_media(base64_data=base64_data, media_type="document", folder="staff-certificates", tenant_id=str(tenant_id))
        except MediaUploadError as e:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e)) from e
        files = [str(x) for x in (staff.certification_files or [])]
        if url not in files:
            files.append(url)
            staff.certification_files = files
            await self.session.commit()
            await self.session.refresh(staff)
        return {"message": "Certificate uploaded successfully", "url": url, "certification_files": files}

    async def delete_certificate(self, tenant_id: uuid.UUID, staff_id: uuid.UUID, file_url: str) -> dict:
        staff = await self.service.get(tenant_id, staff_id)
        if not staff:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Staff member not found")
        files = [str(x) for x in (staff.certification_files or []) if str(x) != file_url]
        staff.certification_files = files
        await self.session.commit()
        await self.session.refresh(staff)
        return {"message": "Certificate deleted successfully", "certification_files": files}

    async def payment_structure(self, tenant_id: uuid.UUID, staff_id: uuid.UUID) -> dict:
        staff = await self.service.get(tenant_id, staff_id)
        if not staff:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Staff member not found")
        try:
            uid = uuid.UUID(str(staff.user_id))
        except Exception:
            uid = None
        user = (await self.session.execute(select(User).where(User.id == uid, User.tenant_id == tenant_id))).scalar_one_or_none() if uid else None
        return {
            "payment_type": staff.payment_type,
            "payment_rate": float(staff.payment_rate or 0),
            "staff_name": f"{user.first_name if user else ''} {user.last_name if user else ''}".strip(),
            "hire_date": staff.hire_date.isoformat() if staff.hire_date else None,
            "status": staff.status,
        }

    async def payment_structure_by_user(self, tenant_id: uuid.UUID, user_id: uuid.UUID) -> dict:
        staff = (await self.session.execute(select(Staff).where(Staff.tenant_id == tenant_id, Staff.user_id == str(user_id)))).scalar_one_or_none()
        if not staff:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Staff profile not found for this user")
        return await self.payment_structure(tenant_id, staff.id)

    async def metrics(self, tenant_id: uuid.UUID, staff_id: uuid.UUID) -> dict:
        staff = await self.service.get(tenant_id, staff_id)
        if not staff:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Staff member not found")
        now = datetime.now(timezone.utc)
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        today_end = today_start + timedelta(days=1)
        month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        week_start = (now - timedelta(days=now.weekday())).replace(hour=0, minute=0, second=0, microsecond=0)
        sid = str(staff_id)

        today_appointments = (await self.session.execute(select(func.count()).select_from(Appointment).where(Appointment.tenant_id == tenant_id, Appointment.staff_id == sid, Appointment.start_time >= today_start, Appointment.start_time < today_end, Appointment.status.in_(["scheduled", "confirmed", "in_progress", "completed"])))).scalar_one()
        upcoming_shifts = 0
        pending_time_off = 0
        comm_rows = (await self.session.execute(select(ServiceCommission).where(ServiceCommission.tenant_id == tenant_id, ServiceCommission.staff_id == staff_id))).scalars().all()
        total = sum((Decimal(str(c.commission_amount or 0)) for c in comm_rows), Decimal("0"))
        this_month = sum((Decimal(str(c.commission_amount or 0)) for c in comm_rows if c.earned_date and c.earned_date >= month_start), Decimal("0"))
        this_week = sum((Decimal(str(c.commission_amount or 0)) for c in comm_rows if c.earned_date and c.earned_date >= week_start), Decimal("0"))
        return {
            "todayAppointments": int(today_appointments or 0),
            "upcomingShifts": upcoming_shifts,
            "pendingTimeOff": pending_time_off,
            "earningsSummary": {"total": float(total), "thisMonth": float(this_month), "thisWeek": float(this_week)},
        }

    async def activity_feed(self, tenant_id: uuid.UUID, staff_id: uuid.UUID, limit: int = 10) -> dict:
        staff = await self.service.get(tenant_id, staff_id)
        if not staff:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Staff member not found")
        sid = str(staff_id)
        events: list[dict] = []
        appts = (await self.session.execute(select(Appointment).where(Appointment.tenant_id == tenant_id, Appointment.staff_id == sid).order_by(Appointment.updated_at.desc()).limit(limit))).scalars().all()
        cust_ids = []
        for a in appts:
            try:
                cust_ids.append(uuid.UUID(str(a.customer_id)))
            except Exception:
                pass
        customers = {}
        if cust_ids:
            rows = (await self.session.execute(select(Customer.id, Customer.first_name, Customer.last_name).where(Customer.tenant_id == tenant_id, Customer.id.in_(cust_ids)))).all()
            customers = {cid: f"{fn} {ln}".strip() for cid, fn, ln in rows}
        for appt in appts:
            cname = "Unknown Customer"
            try:
                cname = customers.get(uuid.UUID(str(appt.customer_id)), cname)
            except Exception:
                pass
            events.append({"id": str(appt.id), "type": "appointment", "title": f"Appointment with {cname}", "description": f"Status: {appt.status}", "timestamp": (appt.updated_at or appt.created_at).isoformat(), "metadata": {"appointmentId": str(appt.id), "status": appt.status}})
        comms = (await self.session.execute(select(ServiceCommission).where(ServiceCommission.tenant_id == tenant_id, ServiceCommission.staff_id == staff_id).order_by(ServiceCommission.created_at.desc()).limit(limit))).scalars().all()
        for c in comms:
            events.append({"id": str(c.id), "type": "earnings", "title": "Commission Earned", "description": f"Amount: {float(c.commission_amount or 0):.2f}", "timestamp": c.created_at.isoformat() if c.created_at else c.earned_date.isoformat(), "metadata": {"commissionId": str(c.id), "amount": float(c.commission_amount or 0)}})
        events.sort(key=lambda x: x.get("timestamp") or "", reverse=True)
        events = events[:limit]
        return {"events": events, "total": len(events)}

    async def performance_metrics(self, tenant_id: uuid.UUID, staff_id: uuid.UUID) -> dict:
        staff = await self.service.get(tenant_id, staff_id)
        if not staff:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Staff member not found")
        sid = str(staff_id)
        completed = (await self.session.execute(select(func.count()).select_from(Appointment).where(Appointment.tenant_id == tenant_id, Appointment.staff_id == sid, Appointment.status == "completed"))).scalar_one()
        reviews = (await self.session.execute(select(AppointmentHistory).where(AppointmentHistory.tenant_id == tenant_id, AppointmentHistory.staff_id == staff_id, AppointmentHistory.rating.is_not(None), AppointmentHistory.rating > 0))).scalars().all()
        total_reviews = len(reviews)
        avg_rating = (sum((r.rating or 0) for r in reviews) / total_reviews) if total_reviews else float(staff.rating or 0)
        dist = {str(i): 0 for i in range(1, 6)}
        for r in reviews:
            star = max(1, min(5, int(r.rating or 0)))
            dist[str(star)] += 1
        total_earnings = (await self.session.execute(select(func.coalesce(func.sum(ServiceCommission.commission_amount), 0)).where(ServiceCommission.tenant_id == tenant_id, ServiceCommission.staff_id == staff_id))).scalar_one()
        recent = []
        for r in sorted(reviews, key=lambda x: x.appointment_date, reverse=True)[:10]:
            recent.append({"id": str(r.id), "customerId": str(r.customer_id), "customerName": "", "appointmentId": str(r.appointment_id), "serviceName": "", "rating": r.rating, "feedback": r.feedback or "", "appointmentDate": r.appointment_date.isoformat(), "createdAt": r.created_at.isoformat() if r.created_at else r.appointment_date.isoformat()})
        return {"averageRating": round(float(avg_rating), 1), "totalReviews": total_reviews, "appointmentsCompleted": int(completed or 0), "customerSatisfaction": min(100, int((float(avg_rating) / 5) * 100)) if avg_rating else 0, "totalEarnings": round(float(total_earnings or 0), 2), "ratingDistribution": dist, "recentReviews": recent}

    async def reviews(self, tenant_id: uuid.UUID, staff_id: uuid.UUID, limit: int = 25) -> dict:
        staff = await self.service.get(tenant_id, staff_id)
        if not staff:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Staff member not found")
        rows = (await self.session.execute(select(AppointmentHistory).where(AppointmentHistory.tenant_id == tenant_id, AppointmentHistory.staff_id == staff_id, AppointmentHistory.rating.is_not(None), AppointmentHistory.rating > 0).order_by(AppointmentHistory.appointment_date.desc()).limit(limit))).scalars().all()
        cust_ids = list({r.customer_id for r in rows})
        svc_ids = list({r.service_id for r in rows})
        cust_map = {}
        svc_map = {}
        if cust_ids:
            crows = (await self.session.execute(select(Customer.id, Customer.first_name, Customer.last_name).where(Customer.tenant_id == tenant_id, Customer.id.in_(cust_ids)))).all()
            cust_map = {cid: f"{fn} {ln}".strip() for cid, fn, ln in crows}
        if svc_ids:
            srows = (await self.session.execute(select(Service.id, Service.name).where(Service.tenant_id == tenant_id, Service.id.in_(svc_ids)))).all()
            svc_map = {sid: name for sid, name in srows}
        reviews = []
        for r in rows:
            reviews.append({"id": str(r.id), "customerId": str(r.customer_id), "customerName": cust_map.get(r.customer_id, ""), "appointmentId": str(r.appointment_id), "serviceName": svc_map.get(r.service_id, ""), "rating": r.rating, "feedback": r.feedback or "", "appointmentDate": r.appointment_date.isoformat(), "createdAt": r.created_at.isoformat() if r.created_at else r.appointment_date.isoformat()})
        total = (await self.session.execute(select(func.count()).select_from(AppointmentHistory).where(AppointmentHistory.tenant_id == tenant_id, AppointmentHistory.staff_id == staff_id, AppointmentHistory.rating.is_not(None), AppointmentHistory.rating > 0))).scalar_one()
        return {"reviews": reviews, "total": int(total or 0)}
