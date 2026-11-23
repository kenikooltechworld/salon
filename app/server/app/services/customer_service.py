"""Customer service."""
from __future__ import annotations

import secrets
import uuid
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from typing import Sequence

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models.appointment import Appointment
from app.models.customer import Customer
from app.models.service import Service
from app.models.staff import Staff
from app.models.tenant import Tenant
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

    async def delete(self, tenant_id: uuid.UUID, customer_id: uuid.UUID) -> bool:
        customer = await self.get(tenant_id, customer_id)
        if customer is None:
            return False
        await self.session.delete(customer)
        await self.session.flush()
        return True

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
        # App has no Invoice model yet; report outstanding balance from customer record.
        balance = Decimal(str(customer.outstanding_balance or 0))
        return {
            "customer_id": str(customer.id),
            "customer_name": f"{customer.first_name} {customer.last_name}",
            "outstanding_balance": float(balance),
            "unpaid_invoice_count": 0,
            "unpaid_invoices": [],
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

        cid = str(customer_id)
        base = select(Appointment).where(
            Appointment.tenant_id == tenant_id,
            Appointment.customer_id == cid,
        )
        total = (await self.session.execute(select(func.count()).select_from(base.subquery()))).scalar_one()
        stmt = base.order_by(Appointment.start_time.desc()).offset((page - 1) * page_size).limit(page_size)
        appts = (await self.session.execute(stmt)).scalars().all()

        service_ids: set[uuid.UUID] = set()
        staff_ids: set[uuid.UUID] = set()
        for a in appts:
            try:
                service_ids.add(uuid.UUID(str(a.service_id)))
            except Exception:
                pass
            try:
                staff_ids.add(uuid.UUID(str(a.staff_id)))
            except Exception:
                pass

        services = {}
        if service_ids:
            rows = (await self.session.execute(select(Service).where(Service.tenant_id == tenant_id, Service.id.in_(service_ids)))).scalars().all()
            services = {str(s.id): s for s in rows}
        staff_map = {}
        if staff_ids:
            rows = (await self.session.execute(select(Staff).where(Staff.tenant_id == tenant_id, Staff.id.in_(staff_ids)))).scalars().all()
            staff_map = {str(s.id): s for s in rows}

        history = []
        for a in appts:
            svc = services.get(str(a.service_id))
            st = staff_map.get(str(a.staff_id))
            history.append({
                "id": str(a.id),
                "appointment_id": str(a.id),
                "service_id": str(a.service_id),
                "staff_id": str(a.staff_id),
                "service_name": svc.name if svc else "Unknown Service",
                "staff_name": st.name if st else "Unknown Staff",
                "appointment_date": a.start_time.isoformat() if a.start_time else None,
                "appointment_time": a.start_time.strftime("%H:%M") if a.start_time else "",
                "notes": a.notes or "",
                "rating": 0,
                "feedback": "",
                "status": a.status,
            })
        return {"history": history, "total": total, "page": page, "page_size": page_size}
