"""Subscription service for managing subscription lifecycle."""
from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.pricing_plan import PricingPlan
from app.models.subscription import Subscription

logger = logging.getLogger(__name__)

DEFAULT_FREE_FEATURES = {
    "max_staff_count": 1,
    "has_pos": False,
    "has_api_access": False,
    "has_advanced_reports": False,
    "has_multi_location": False,
    "has_white_label": False,
    "support_level": "email",
}


class SubscriptionService:
    @staticmethod
    async def _ensure_free_plan(session: AsyncSession, trial_days: int) -> PricingPlan:
        result = await session.execute(select(PricingPlan).where(PricingPlan.tier_level == 0))
        plan = result.scalar_one_or_none()
        if plan:
            if trial_days and plan.trial_days != trial_days:
                plan.trial_days = trial_days
                plan.is_trial_plan = True
                await session.flush()
            return plan

        plan = PricingPlan(
            name="Free",
            tier_level=0,
            description="Free trial plan",
            monthly_price=0.0,
            yearly_price=0.0,
            currency="NGN",
            features=dict(DEFAULT_FREE_FEATURES),
            trial_days=trial_days,
            is_trial_plan=True,
            is_active=True,
            is_featured=False,
        )
        session.add(plan)
        await session.flush()
        return plan

    @staticmethod
    async def create_trial_subscription(session: AsyncSession, tenant_id, trial_days: int = 30) -> Subscription:
        existing = await session.execute(select(Subscription).where(Subscription.tenant_id == tenant_id))
        sub = existing.scalar_one_or_none()
        if sub:
            logger.info("Subscription already exists for tenant %s", tenant_id)
            return sub

        free_plan = await SubscriptionService._ensure_free_plan(session, trial_days)
        now = datetime.now(timezone.utc)
        trial_end = now + timedelta(days=trial_days)

        sub = Subscription(
            tenant_id=tenant_id,
            pricing_plan_id=free_plan.id,
            billing_cycle="monthly",
            current_period_start=now,
            current_period_end=trial_end,
            next_billing_date=trial_end,
            trial_end=trial_end,
            is_trial=True,
            status="trial",
            subscription_status="trial",
            transaction_fee_percentage=0.0,
            trial_expiry_action_required=False,
            is_in_grace_period=False,
            failed_payment_count=0,
            auto_renew=True,
            renewal_reminders_sent={},
        )
        session.add(sub)
        await session.flush()
        logger.info("Trial subscription created for tenant %s", tenant_id)
        return sub
