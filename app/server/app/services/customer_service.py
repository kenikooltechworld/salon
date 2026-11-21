"""Customer service."""
from __future__ import annotations

import uuid
from typing import Sequence

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.customer import Customer
from app.schemas.customer import CustomerCreate, CustomerUpdate


class CustomerService:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def list_customers(
        self, tenant_id: uuid.UUID, *, status: str | None = None
    ) -> Sequence[Customer]:
        stmt = select(Customer).where(Customer.tenant_id == tenant_id)
        if status:
            stmt = stmt.where(Customer.status == status)
        stmt = stmt.order_by(Customer.created_at.desc())
        result = await self.session.execute(stmt)
        return result.scalars().all()

    async def create(self, tenant_id: uuid.UUID, data: CustomerCreate) -> Customer:
        customer = Customer(tenant_id=tenant_id, **data.model_dump())
        self.session.add(customer)
        await self.session.flush()
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
