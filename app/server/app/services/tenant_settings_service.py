from __future__ import annotations

from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.subscription import Subscription
from app.models.tenant import Tenant
from app.schemas.tenant_settings import (
    CommissionSettingsSchema,
    FinancialConfigSchema,
    OperationalConfigSchema,
    TenantSettingsSchema,
    default_commission_settings,
    default_financial_config,
    default_operational_config,
)


DEFAULT_SETTINGS = TenantSettingsSchema(salon_name="My Salon", email="", phone="", address="").model_dump()


def _subdomain_url(tenant: Tenant) -> str:
    from app.config import settings
    domain = settings.platform_domain.strip().strip("/") or "kenikoolsalon.com"
    env = settings.environment.lower()
    if not tenant.subdomain:
        return ""
    if env == "development":
        return f"http://{tenant.subdomain}.{domain}:3000"
    return f"https://{tenant.subdomain}.{domain}"


def _subscription_payload(tenant: Tenant, subscription: Subscription | None = None) -> dict[str, Any]:
    tier = tenant.subscription_tier or "trial"
    status = tenant.status or "active"
    billing_cycle = "monthly" if tier != "trial" else "trial"
    payload = {
        "plan_name": tier.capitalize(),
        "plan_tier": {"trial": 0, "starter": 1, "professional": 2, "enterprise": 3, "basic": 1, "pro": 2}.get(tier, 0),
        "billing_cycle": billing_cycle,
        "status": status,
        "subscription_status": status,
        "trial_end": None,
        "next_billing_date": None,
        "current_period_end": None,
        "is_trial": tier == "trial",
    }
    if subscription:
        payload.update({
            "billing_cycle": subscription.billing_cycle or payload["billing_cycle"],
            "status": subscription.status or payload["status"],
            "subscription_status": subscription.subscription_status or payload["subscription_status"],
            "trial_end": subscription.trial_end.isoformat() if subscription.trial_end else None,
            "next_billing_date": subscription.next_billing_date.isoformat() if subscription.next_billing_date else None,
            "current_period_end": subscription.current_period_end.isoformat() if subscription.current_period_end else None,
            "is_trial": bool(subscription.is_trial),
        })
    return payload


async def tenant_settings_payload_async(session: AsyncSession, tenant: Tenant) -> dict[str, Any]:
    result = await session.execute(select(Subscription).where(Subscription.tenant_id == tenant.id))
    subscription = result.scalar_one_or_none()
    return tenant_settings_payload(tenant, subscription=subscription)


def tenant_settings_payload(tenant: Tenant, subscription: Subscription | None = None) -> dict[str, Any]:
    stored = dict(tenant.settings or {})
    merged = {**DEFAULT_SETTINGS, **stored}
    merged.update({
        "salon_name": tenant.name,
        "email": tenant.email or merged.get("email") or "",
        "phone": tenant.phone or merged.get("phone") or "",
        "address": tenant.address or merged.get("address") or "",
        "logo_url": tenant.logo_url if tenant.logo_url is not None else merged.get("logo_url"),
        "primary_color": tenant.primary_color or merged.get("primary_color") or "#000000",
        "secondary_color": tenant.secondary_color or merged.get("secondary_color") or "#FFFFFF",
    })
    schema = TenantSettingsSchema(**merged)
    data = schema.model_dump()
    sub = _subscription_payload(tenant, subscription=subscription)
    data.update({
        "tenant_id": str(tenant.id),
        "tenant_name": tenant.name,
        "subdomain": tenant.subdomain,
        "subdomain_url": _subdomain_url(tenant),
        "region": tenant.region,
        "subscription_tier": tenant.subscription_tier,
        "status": tenant.status,
        "is_published": tenant.is_published,
        **sub,
    })
    return {"data": data}


def commission_settings_payload(tenant: Tenant) -> dict[str, Any]:
    stored = dict(tenant.settings or {})
    raw = stored.get("commission_config") or {}
    config = CommissionSettingsSchema(**raw).model_dump() if isinstance(raw, dict) else default_commission_settings()
    return {"data": config}


async def update_commission_settings(session: AsyncSession, tenant: Tenant, updates: dict[str, Any]) -> dict[str, Any]:
    config = CommissionSettingsSchema(**updates).model_dump()
    current = dict(tenant.settings or {})
    current["commission_config"] = config
    tenant.settings = current
    await session.commit()
    await session.refresh(tenant)
    return {"data": config}


def financial_settings_payload(tenant: Tenant) -> dict[str, Any]:
    stored = dict(tenant.settings or {})
    raw = stored.get("financial_config") or {}
    config = FinancialConfigSchema(**raw).model_dump() if isinstance(raw, dict) else default_financial_config()
    return {"data": config}


async def update_financial_settings(session: AsyncSession, tenant: Tenant, updates: dict[str, Any]) -> dict[str, Any]:
    config = FinancialConfigSchema(**updates).model_dump()
    current = dict(tenant.settings or {})
    current["financial_config"] = config
    tenant.settings = current
    await session.commit()
    await session.refresh(tenant)
    return {"data": config}


def operational_settings_payload(tenant: Tenant) -> dict[str, Any]:
    stored = dict(tenant.settings or {})
    raw = stored.get("operational_config") or {}
    config = OperationalConfigSchema(**raw).model_dump() if isinstance(raw, dict) else default_operational_config()
    return {"data": config}


async def update_operational_settings(session: AsyncSession, tenant: Tenant, updates: dict[str, Any]) -> dict[str, Any]:
    config = OperationalConfigSchema(**updates).model_dump()
    current = dict(tenant.settings or {})
    current["operational_config"] = config
    tenant.settings = current
    await session.commit()
    await session.refresh(tenant)
    return {"data": config}


async def update_tenant_settings(session: AsyncSession, tenant: Tenant, updates: dict[str, Any]) -> dict[str, Any]:
    schema = TenantSettingsSchema(**updates)
    data = schema.model_dump()
    tenant.name = data["salon_name"]
    tenant.email = data["email"] or None
    tenant.phone = data["phone"] or None
    tenant.address = data["address"] or None
    tenant.logo_url = data["logo_url"]
    tenant.primary_color = data["primary_color"]
    tenant.secondary_color = data["secondary_color"]

    current = dict(tenant.settings or {})
    preserved = {k: v for k, v in current.items() if k in {"financial_config", "operational_config", "customer_welcome_email_template", "commission_config"}}
    current.update(data)
    current.update(preserved)
    tenant.settings = current

    await session.commit()
    await session.refresh(tenant)
    return tenant_settings_payload(tenant)


async def reset_tenant_settings(session: AsyncSession, tenant: Tenant) -> dict[str, Any]:
    defaults = TenantSettingsSchema(salon_name=tenant.name or "My Salon", email=tenant.email or "", phone=tenant.phone or "", address=tenant.address or "").model_dump()
    return await update_tenant_settings(session, tenant, defaults)
