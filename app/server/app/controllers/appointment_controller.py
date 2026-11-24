"""Appointment controller."""
from __future__ import annotations

import uuid

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.customer import Customer
from app.models.service import Service
from app.models.staff import Staff
from app.models.user import User
from app.schemas.appointment import AppointmentAction, AppointmentCreate, AppointmentDetailRead, AppointmentListResponse, AppointmentRead, AppointmentUpdate
from app.schemas.notification import NotificationCreate
from app.services.appointment_history_service import AppointmentHistoryService
from app.services.appointment_service import AppointmentService
from app.services.notification_service import NotificationService
from app.services.service_commission_service import ServiceCommissionService


class AppointmentController:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.service = AppointmentService(session)
        self.notifications = NotificationService(session)
        self.commissions = ServiceCommissionService(session)
        self.history = AppointmentHistoryService(session)

    async def list(self, tenant_id: uuid.UUID, **kwargs) -> AppointmentListResponse:
        items, total = await self.service.list_appointments(tenant_id, **kwargs)
        page = kwargs.get("page", 1)
        page_size = kwargs.get("page_size", 50)
        return AppointmentListResponse(appointments=[AppointmentRead.model_validate(i) for i in items], total=total, page=page, page_size=page_size)

    async def create(self, tenant_id: uuid.UUID, actor_id: uuid.UUID, data: AppointmentCreate) -> AppointmentRead:
        item = await self.service.create(tenant_id, data)
        await self.session.flush()
        await self.history.create_from_appointment(tenant_id, item.id)
        await self.notifications.create(tenant_id, NotificationCreate(recipient_id=actor_id, notification_type="appointment.created", title="Appointment created", content=f"Appointment for {item.start_time.isoformat()} was created.", data={"appointment_id": str(item.id), "status": item.status}))
        return AppointmentRead.model_validate(item)

    async def get(self, tenant_id: uuid.UUID, appointment_id: uuid.UUID) -> AppointmentRead:
        item = await self.service.get(tenant_id, appointment_id)
        if item is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Appointment not found")
        return AppointmentRead.model_validate(item)

    async def get_detail(self, tenant_id: uuid.UUID, appointment_id: uuid.UUID) -> AppointmentDetailRead:
        item = await self.service.get(tenant_id, appointment_id)
        if item is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Appointment not found")
        base = AppointmentRead.model_validate(item).model_dump()

        customer = None
        if item.customer_id:
            try:
                cid = uuid.UUID(str(item.customer_id))
                c = (await self.session.execute(select(Customer).where(Customer.id == cid, Customer.tenant_id == tenant_id))).scalar_one_or_none()
                if c:
                    customer = {"id": str(c.id), "first_name": c.first_name, "last_name": c.last_name, "email": c.email, "phone": c.phone}
            except Exception:
                pass

        service = None
        try:
            sid = uuid.UUID(str(item.service_id))
            s = (await self.session.execute(select(Service).where(Service.id == sid, Service.tenant_id == tenant_id))).scalar_one_or_none()
            if s:
                service = {"id": str(s.id), "name": s.name, "duration_minutes": s.duration_minutes, "price": str(s.price) if s.price is not None else None}
        except Exception:
            pass

        staff_data = None
        try:
            stid = uuid.UUID(str(item.staff_id))
            st = (await self.session.execute(select(Staff).where(Staff.id == stid, Staff.tenant_id == tenant_id))).scalar_one_or_none()
            if st:
                user = None
                try:
                    uid = uuid.UUID(str(st.user_id))
                    user = (await self.session.execute(select(User).where(User.id == uid))).scalar_one_or_none()
                except Exception:
                    pass
                staff_data = {
                    "id": str(st.id), "user_id": str(st.user_id),
                    "first_name": user.first_name if user else "", "last_name": user.last_name if user else "",
                    "email": user.email if user else "", "phone": user.phone if user else "",
                }
        except Exception:
            pass

        base.update({"customer": customer, "service": service, "staff": staff_data})
        return AppointmentDetailRead(**base)

    async def update(self, tenant_id: uuid.UUID, actor_id: uuid.UUID, appointment_id: uuid.UUID, data: AppointmentUpdate) -> AppointmentRead:
        before = await self.service.get(tenant_id, appointment_id)
        if before is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Appointment not found")
        prev_status = before.status
        item = await self.service.update(tenant_id, appointment_id, data)
        if item is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Appointment not found")

        if item.status == "completed" and prev_status != "completed":
            await self.commissions.calculate_for_appointment(tenant_id, item.id)
        if item.status in {"confirmed", "completed", "cancelled", "no_show"}:
            await self.history.create_from_appointment(tenant_id, item.id)
        await self.session.flush()
        await self.notifications.create(tenant_id, NotificationCreate(recipient_id=actor_id, notification_type="appointment.updated", title="Appointment updated", content=f"Appointment status is {item.status}.", data={"appointment_id": str(item.id), "status": item.status, "previous_status": prev_status}))
        return AppointmentRead.model_validate(item)

    async def action(self, tenant_id: uuid.UUID, actor_id: uuid.UUID, appointment_id: uuid.UUID, action: str, body: AppointmentAction | None = None) -> AppointmentRead:
        reason = body.reason if body else None
        mapping = {
            "confirm": AppointmentUpdate(status="confirmed"),
            "complete": AppointmentUpdate(status="completed"),
            "cancel": AppointmentUpdate(status="cancelled", cancellation_reason=reason or "Cancelled"),
            "no-show": AppointmentUpdate(status="no_show", no_show_reason=reason or "Marked as no-show"),
            "start": AppointmentUpdate(status="in_progress"),
        }
        if action not in mapping:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid appointment action")
        return await self.update(tenant_id, actor_id, appointment_id, mapping[action])

    async def delete(self, tenant_id: uuid.UUID, actor_id: uuid.UUID, appointment_id: uuid.UUID) -> None:
        item = await self.service.get(tenant_id, appointment_id)
        if item is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Appointment not found")
        ok = await self.service.delete(tenant_id, appointment_id)
        if not ok:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Appointment not found")
        await self.session.flush()
        await self.notifications.create(tenant_id, NotificationCreate(recipient_id=actor_id, notification_type="appointment.deleted", title="Appointment deleted", content="An appointment was deleted.", data={"appointment_id": str(appointment_id)}))
