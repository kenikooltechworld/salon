"""Customer preference service."""
from __future__ import annotations

import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.customer import Customer
from app.models.customer_preference import CustomerPreference
from app.schemas.customer_preference import CustomerPreferenceUpdate


class CustomerPreferenceService:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_or_create(self, tenant_id: uuid.UUID, customer_id: uuid.UUID) -> CustomerPreference | None:
        cust = (await self.session.execute(
            select(Customer).where(Customer.id == customer_id, Customer.tenant_id == tenant_id)
        )).scalar_one_or_none()
        if cust is None:
            return None
        pref = (await self.session.execute(
            select(CustomerPreference).where(
                CustomerPreference.tenant_id == tenant_id,
                CustomerPreference.customer_id == str(customer_id),
            )
        )).scalar_one_or_none()
        if pref is None:
            pref = CustomerPreference(
                tenant_id=tenant_id,
                customer_id=str(customer_id),
                preferred_staff_ids=[],
                preferred_service_ids=[],
                communication_methods=["email"],
                preferred_time_slots=[],
                language="en",
            )
            self.session.add(pref)
            await self.session.flush()
            await self.session.refresh(pref)
        return pref

    async def update(self, tenant_id: uuid.UUID, customer_id: uuid.UUID, data: CustomerPreferenceUpdate) -> CustomerPreference | None:
        pref = await self.get_or_create(tenant_id, customer_id)
        if pref is None:
            return None
        for field, value in data.model_dump(exclude_unset=True).items():
            setattr(pref, field, value)
        await self.session.flush()
        await self.session.refresh(pref)
        return pref
