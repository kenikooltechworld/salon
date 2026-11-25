"""Customer service."""
from __future__ import annotations

import secrets
import uuid
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from typing import Sequence

from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models.appointment import Appointment
from app.models.appointment_history import AppointmentHistory
from app.models.customer import Customer
from app.models.customer_preference import CustomerPreference
from app.models.invoice import Invoice
from app.models.notification import Notification
from app.models.payment import Payment
from app.models.service import Service
from app.models.staff import Staff
from app.models.tenant import Tenant
from app.models.user import User
from app.schemas.customer import CustomerCreate, CustomerUpdate
from app.services.email_service import send_email
from app.services.email_template_service import render_customer_welcome_email


def _portal_setup_url(tenant: Tenant, token: str) -> str:
    domain = settings.platform_domain.strip().strip(".")
    return f"https://{tenant.subdomain}.{domain}/customer/setup-password?token={token}"


def _booking_url(tenant: Tenant) -> str:
    domain = settings.platform_domain.strip().strip(".")
    return f"https://{tenant.subdomain}.{domain}/book"


class CustomerService:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def list_customers(
        self,
        tenant_id: uuid.UUID,
        *,
        status: str | None = None,
        search: str | None = None,
        page: int = 1,
        page_size: int = 20,
    ) -> tuple[Sequence[Customer], int]:
        stmt = select(Customer).where(Customer.tenant_id == tenant_id)
        count_stmt = select(func.count()).select_from(Customer).where(Customer.tenant_id == tenant_id)

        if status:
            stmt = stmt.where(Customer.status == status)
            count_stmt = count_stmt.where(Customer.status == status)

        if search:
            pattern = f"%{search.strip()}%"
            search_filter = (
                Customer.first_name.ilike(pattern)
                | Customer.last_name.ilike(pattern)
                | Customer.email.ilike(pattern)
                | Customer.phone.ilike(pattern)
            )
            stmt = stmt.where(search_filter)
            count_stmt = count_stmt.where(search_filter)

        total = (await self.session.execute(count_stmt)).scalar_one()
        stmt = stmt.order_by(Customer.created_at.desc()).offset((page - 1) * page_size).limit(page_size)
        result = await self.session.execute(stmt)
        return result.scalars().all(), total

    async def create(self, tenant_id: uuid.UUID, data: CustomerCreate) -> Customer:
        customer = Customer(
            tenant_id=tenant_id,
            **data.model_dump(),
        )
        if customer.preferred_services is None:
            customer.preferred_services = []
        self.session.add(customer)
        await self.session.flush()

        tenant = (await self.session.execute(select(Tenant).where(Tenant.id == tenant_id))).scalar_one_or_none()
        if tenant:
            setup_token = secrets.token_urlsafe(32)
            customer.password_reset_token = setup_token
            customer.password_reset_expires = datetime.now(timezone.utc) + timedelta(days=7)
            await self.session.flush()

            context = {
                "customer_name": f"{customer.first_name} {customer.last_name}",
                "customer_email": customer.email,
                "customer_phone": customer.phone,
                "business_name": tenant.name,
                "business_address": tenant.address or "",
                "business_phone": tenant.phone or (tenant.settings or {}).get("phone", ""),
                "business_email": tenant.email or (tenant.settings or {}).get("email", ""),
                "logo_url": tenant.logo_url or "",
                "primary_color": tenant.primary_color or "#6366f1",
                "secondary_color": tenant.secondary_color or "#8b5cf6",
                "booking_url": _booking_url(tenant),
                "setup_url": _portal_setup_url(tenant, setup_token),
            }
            html = render_customer_welcome_email(tenant, context)
            await send_email(
                customer.email,
                f"Welcome to {tenant.name}!",
                html,
                required=False,
            )

        await self.session.refresh(customer)
        return customer

    async def get(self, tenant_id: uuid.UUID, customer_id: uuid.UUID) -> Customer | None:
        result = await self.session.execute(
            select(Customer).where(Customer.id == customer_id, Customer.tenant_id == tenant_id)
        )
        return result.scalar_one_or_none()

    async def update(
        self, tenant_id: uuid.UUID, customer_id: uuid.UUID, data: CustomerUpdate
    ) -> Customer | None:
        customer = await self.get(tenant_id, customer_id)
        if customer is None:
            return None
        for field, value in data.model_dump(exclude_unset=True).items():
            setattr(customer, field, value)
        await self.session.flush()
        await self.session.refresh(customer)
        return customer

    async def delete(self, tenant_id: uuid.UUID, customer_id: uuid.UUID) -> dict | None:
        customer = await self.get(tenant_id, customer_id)
        if customer is None:
            return None

        cid_str = str(customer_id)
        related: dict[str, int] = {}
        for name, stmt in [
            ("appointment_history", select(func.count()).select_from(AppointmentHistory).where(AppointmentHistory.tenant_id == tenant_id, AppointmentHistory.customer_id == customer_id)),
            ("appointments", select(func.count()).select_from(Appointment).where(Appointment.tenant_id == tenant_id, Appointment.customer_id == cid_str)),
            ("invoices", select(func.count()).select_from(Invoice).where(Invoice.tenant_id == tenant_id, Invoice.customer_id == customer_id)),
            ("payments", select(func.count()).select_from(Payment).where(Payment.tenant_id == tenant_id, Payment.customer_id == customer_id)),
        ]:
            count = int((await self.session.execute(stmt)).scalar_one() or 0)
            if count:
                related[name] = count
        if related:
            customer.status = "inactive"
            await self.session.flush()
            return {
                "action": "deactivated",
                "customer_id": cid_str,
                "customer_name": f"{customer.first_name} {customer.last_name}",
                "related_records": related,
                "customer_deactivated": True,
            }

        deleted: dict[str, int] = {}
        res = await self.session.execute(delete(CustomerPreference).where(CustomerPreference.tenant_id == tenant_id, CustomerPreference.customer_id == cid_str))
        deleted["customer_preferences"] = res.rowcount or 0
        res = await self.session.execute(
            delete(Notification).where(
                Notification.tenant_id == tenant_id,
                Notification.recipient_id == customer_id,
                Notification.recipient_type == "customer",
            )
        )
        deleted["notifications"] = res.rowcount or 0

        await self.session.delete(customer)
        await self.session.flush()
        return {
            "action": "deleted",
            "customer_id": cid_str,
            "customer_name": f"{customer.first_name} {customer.last_name}",
            "deleted_records": deleted,
            "total_related_records_deleted": sum(deleted.values()),
            "customer_deleted": True,
        }

    async def resend_portal_invitation(self, tenant_id: uuid.UUID, customer_id: uuid.UUID) -> tuple[bool, str]:
        customer = await self.get(tenant_id, customer_id)
        if customer is None:
            return False, "Customer not found"
        if customer.password_hash:
            return False, "Customer already has portal access"

        tenant = (await self.session.execute(select(Tenant).where(Tenant.id == tenant_id))).scalar_one_or_none()
        if tenant is None:
            return False, "Tenant not found"

        setup_token = secrets.token_urlsafe(32)
        customer.password_reset_token = setup_token
        customer.password_reset_expires = datetime.now(timezone.utc) + timedelta(days=7)
        await self.session.flush()

        context = {
            "customer_name": f"{customer.first_name} {customer.last_name}",
            "customer_email": customer.email,
            "customer_phone": customer.phone,
            "business_name": tenant.name,
            "business_address": tenant.address or "",
            "business_phone": tenant.phone or (tenant.settings or {}).get("phone", ""),
            "business_email": tenant.email or (tenant.settings or {}).get("email", ""),
            "logo_url": tenant.logo_url or "",
            "primary_color": tenant.primary_color or "#6366f1",
            "secondary_color": tenant.secondary_color or "#8b5cf6",
            "booking_url": _booking_url(tenant),
            "setup_url": _portal_setup_url(tenant, setup_token),
        }
        html = render_customer_welcome_email(tenant, context)
        await send_email(customer.email, f"Set up your {tenant.name} customer portal access", html, required=False)
        return True, "Portal invitation sent successfully"

    async def get_balance(self, tenant_id: uuid.UUID, customer_id: uuid.UUID) -> dict | None:
        customer = await self.get(tenant_id, customer_id)
        if customer is None:
            return None
        stmt = select(Invoice).where(
            Invoice.tenant_id == tenant_id,
            Invoice.customer_id == customer_id,
            Invoice.status.in_(["issued", "overdue"]),
        ).order_by(Invoice.created_at.desc())
        invoices = (await self.session.execute(stmt)).scalars().all()
        balance = sum((Decimal(str(inv.total or 0)) for inv in invoices), Decimal("0"))
        if Decimal(str(customer.outstanding_balance or 0)) != balance:
            customer.outstanding_balance = balance
            await self.session.flush()
        return {
            "customer_id": str(customer.id),
            "customer_name": f"{customer.first_name} {customer.last_name}",
            "outstanding_balance": float(balance),
            "unpaid_invoice_count": len(invoices),
            "unpaid_invoices": [
                {
                    "invoice_id": str(inv.id),
                    "amount": float(Decimal(str(inv.total or 0))),
                    "status": inv.status,
                    "due_date": inv.due_date.isoformat() if inv.due_date else None,
                    "created_at": inv.created_at.isoformat() if inv.created_at else None,
                }
                for inv in invoices
            ],
        }

    async def update_balance(self, tenant_id: uuid.UUID, customer_id: uuid.UUID) -> dict | None:
        info = await self.get_balance(tenant_id, customer_id)
        if info is None:
            return None
        return {
            "customer_id": info["customer_id"],
            "updated_balance": info["outstanding_balance"],
            "message": "Balance updated successfully",
        }

    async def booking_eligibility(self, tenant_id: uuid.UUID, customer_id: uuid.UUID) -> dict | None:
        info = await self.get_balance(tenant_id, customer_id)
        if info is None:
            return None
        balance = Decimal(str(info["outstanding_balance"]))
        eligible = balance == 0
        return {
            "customer_id": info["customer_id"],
            "customer_name": info["customer_name"],
            "outstanding_balance": float(balance),
            "is_eligible_to_book": eligible,
            "reason": "No outstanding balance" if eligible else f"Outstanding balance of {balance} must be paid before booking",
        }

    async def get_history(
        self, tenant_id: uuid.UUID, customer_id: uuid.UUID, *, page: int = 1, page_size: int = 20
    ) -> dict | None:
        customer = await self.get(tenant_id, customer_id)
        if customer is None:
            return None

        base = select(AppointmentHistory).where(
            AppointmentHistory.tenant_id == tenant_id,
            AppointmentHistory.customer_id == customer_id,
        )
        total = (await self.session.execute(select(func.count()).select_from(base.subquery()))).scalar_one()
        stmt = base.order_by(AppointmentHistory.appointment_date.desc()).offset((page - 1) * page_size).limit(page_size)
        entries = (await self.session.execute(stmt)).scalars().all()

        # Fallback for pre-history appointments: map appointments to history-like rows.
        if total == 0:
            cid = str(customer_id)
            abase = select(Appointment).where(Appointment.tenant_id == tenant_id, Appointment.customer_id == cid)
            atotal = (await self.session.execute(select(func.count()).select_from(abase.subquery()))).scalar_one()
            astmt = abase.order_by(Appointment.start_time.desc()).offset((page - 1) * page_size).limit(page_size)
            appts = (await self.session.execute(astmt)).scalars().all()
            service_ids: set[uuid.UUID] = set()
            staff_ids: set[uuid.UUID] = set()
            for a in appts:
                try: service_ids.add(uuid.UUID(str(a.service_id)))
                except Exception: pass
                try: staff_ids.add(uuid.UUID(str(a.staff_id)))
                except Exception: pass
            services = {}
            if service_ids:
                rows = (await self.session.execute(select(Service).where(Service.tenant_id == tenant_id, Service.id.in_(service_ids)))).scalars().all()
                services = {s.id: s for s in rows}
            staff_rows = (await self.session.execute(select(Staff).where(Staff.tenant_id == tenant_id, Staff.id.in_(staff_ids)))).scalars().all() if staff_ids else []
            user_ids: set[uuid.UUID] = set()
            for st in staff_rows:
                try: user_ids.add(uuid.UUID(str(st.user_id)))
                except Exception: pass
            users = {}
            if user_ids:
                urows = (await self.session.execute(select(User).where(User.id.in_(user_ids)))).scalars().all()
                users = {u.id: u for u in urows}
            staff_names = {}
            for st in staff_rows:
                try:
                    u = users.get(uuid.UUID(str(st.user_id)))
                    staff_names[st.id] = (f"{u.first_name or ''} {u.last_name or ''}".strip() or u.email) if u else str(st.user_id)
                except Exception:
                    staff_names[st.id] = str(st.user_id)
            history = []
            for a in appts:
                try: sid = uuid.UUID(str(a.service_id))
                except Exception: sid = None
                try: stid = uuid.UUID(str(a.staff_id))
                except Exception: stid = None
                svc = services.get(sid) if sid else None
                history.append({
                    "id": str(a.id), "appointment_id": str(a.id), "service_id": str(a.service_id), "staff_id": str(a.staff_id),
                    "service_name": svc.name if svc else "Unknown Service", "staff_name": staff_names.get(stid, "Unknown Staff") if stid else "Unknown Staff",
                    "appointment_date": a.start_time.isoformat() if a.start_time else None,
                    "appointment_time": a.start_time.strftime("%H:%M") if a.start_time else "",
                    "notes": a.notes or "", "rating": 0, "feedback": "", "status": a.status,
                    "amount_paid": float(Decimal(str(a.price or 0))),
                })
            return {"history": history, "total": atotal, "page": page, "page_size": page_size}

        service_ids = {e.service_id for e in entries}
        staff_ids = {e.staff_id for e in entries}
        appt_ids = {e.appointment_id for e in entries}

        services = {}
        if service_ids:
            rows = (await self.session.execute(select(Service).where(Service.tenant_id == tenant_id, Service.id.in_(service_ids)))).scalars().all()
            services = {s.id: s for s in rows}

        staff_rows = []
        if staff_ids:
            staff_rows = (await self.session.execute(select(Staff).where(Staff.tenant_id == tenant_id, Staff.id.in_(staff_ids)))).scalars().all()
        user_ids: set[uuid.UUID] = set()
        for st in staff_rows:
            try:
                user_ids.add(uuid.UUID(str(st.user_id)))
            except Exception:
                pass
        users = {}
        if user_ids:
            urows = (await self.session.execute(select(User).where(User.id.in_(user_ids)))).scalars().all()
            users = {u.id: u for u in urows}

        staff_names: dict[uuid.UUID, str] = {}
        for st in staff_rows:
            name = "Unknown Staff"
            try:
                u = users.get(uuid.UUID(str(st.user_id)))
                if u:
                    full = f"{u.first_name or ''} {u.last_name or ''}".strip()
                    name = full or u.email or str(st.user_id)
                else:
                    name = str(st.user_id)
            except Exception:
                name = str(st.user_id)
            staff_names[st.id] = name

        appt_status = {}
        if appt_ids:
            arows = (await self.session.execute(select(Appointment.id, Appointment.status).where(Appointment.tenant_id == tenant_id, Appointment.id.in_(appt_ids)))).all()
            appt_status = {aid: status for aid, status in arows}

        history = []
        for e in entries:
            svc = services.get(e.service_id)
            history.append({
                "id": str(e.id),
                "appointment_id": str(e.appointment_id),
                "service_id": str(e.service_id),
                "staff_id": str(e.staff_id),
                "service_name": svc.name if svc else "Unknown Service",
                "staff_name": staff_names.get(e.staff_id, "Unknown Staff"),
                "appointment_date": e.appointment_date.isoformat() if e.appointment_date else None,
                "appointment_time": e.appointment_date.strftime("%H:%M") if e.appointment_date else "",
                "notes": e.notes or "",
                "rating": e.rating or 0,
                "feedback": e.feedback or "",
                "status": appt_status.get(e.appointment_id, "completed"),
                "amount_paid": float(Decimal(str(e.amount_paid or 0))),
            })
        return {"history": history, "total": total, "page": page, "page_size": page_size}

    async def get_history_item(self, tenant_id: uuid.UUID, customer_id: uuid.UUID, history_id: uuid.UUID) -> dict | None:
        customer = await self.get(tenant_id, customer_id)
        if customer is None:
            return None
        entry = (await self.session.execute(select(AppointmentHistory).where(AppointmentHistory.tenant_id == tenant_id, AppointmentHistory.customer_id == customer_id, AppointmentHistory.id == history_id))).scalar_one_or_none()
        if entry:
            svc = (await self.session.execute(select(Service).where(Service.tenant_id == tenant_id, Service.id == entry.service_id))).scalar_one_or_none()
            st = (await self.session.execute(select(Staff).where(Staff.tenant_id == tenant_id, Staff.id == entry.staff_id))).scalar_one_or_none()
            staff_name = "Unknown Staff"
            if st:
                try:
                    u = (await self.session.execute(select(User).where(User.id == uuid.UUID(str(st.user_id))))).scalar_one_or_none()
                    staff_name = (f"{u.first_name or ''} {u.last_name or ''}".strip() or u.email) if u else str(st.user_id)
                except Exception:
                    staff_name = str(st.user_id)
            appt_status = (await self.session.execute(select(Appointment.status).where(Appointment.tenant_id == tenant_id, Appointment.id == entry.appointment_id))).scalar_one_or_none()
            return {
                "id": str(entry.id), "appointment_id": str(entry.appointment_id), "service_id": str(entry.service_id), "staff_id": str(entry.staff_id),
                "service_name": svc.name if svc else "Unknown Service", "staff_name": staff_name,
                "appointment_date": entry.appointment_date.isoformat() if entry.appointment_date else None,
                "appointment_time": entry.appointment_date.strftime("%H:%M") if entry.appointment_date else "",
                "notes": entry.notes or "", "rating": entry.rating or 0, "feedback": entry.feedback or "", "status": appt_status or "completed",
                "amount_paid": float(Decimal(str(entry.amount_paid or 0))),
            }
        # fallback: history_id may be appointment id from appointment fallback
        try:
            appt = (await self.session.execute(select(Appointment).where(Appointment.tenant_id == tenant_id, Appointment.id == history_id, Appointment.customer_id == str(customer_id)))).scalar_one_or_none()
        except Exception:
            appt = None
        if appt is None:
            return None
        svc = None
        st = None
        try: svc = (await self.session.execute(select(Service).where(Service.tenant_id == tenant_id, Service.id == uuid.UUID(str(appt.service_id))))).scalar_one_or_none()
        except Exception: pass
        try: st = (await self.session.execute(select(Staff).where(Staff.tenant_id == tenant_id, Staff.id == uuid.UUID(str(appt.staff_id))))).scalar_one_or_none()
        except Exception: pass
        staff_name = "Unknown Staff"
        if st:
            try:
                u = (await self.session.execute(select(User).where(User.id == uuid.UUID(str(st.user_id))))).scalar_one_or_none()
                staff_name = (f"{u.first_name or ''} {u.last_name or ''}".strip() or u.email) if u else str(st.user_id)
            except Exception:
                staff_name = str(st.user_id)
        return {
            "id": str(appt.id), "appointment_id": str(appt.id), "service_id": str(appt.service_id), "staff_id": str(appt.staff_id),
            "service_name": svc.name if svc else "Unknown Service", "staff_name": staff_name,
            "appointment_date": appt.start_time.isoformat() if appt.start_time else None,
            "appointment_time": appt.start_time.strftime("%H:%M") if appt.start_time else "",
            "notes": appt.notes or "", "rating": 0, "feedback": "", "status": appt.status,
            "amount_paid": float(Decimal(str(appt.price or 0))),
        }
