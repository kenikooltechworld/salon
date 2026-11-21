"""Customer controller."""
from __future__ import annotations

import uuid

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.schemas.customer import CustomerCreate, CustomerRead, CustomerUpdate
from app.services.customer_service import CustomerService


class CustomerController:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.service = CustomerService(session)

    async def list(self, tenant_id: uuid.UUID, status: str | None = None) -> list[CustomerRead]:
        items = await self.service.list_customers(tenant_id, status=status)
        return [CustomerRead.model_validate(i) for i in items]

    async def create(self, tenant_id: uuid.UUID, data: CustomerCreate) -> CustomerRead:
        item = await self.service.create(tenant_id, data)
        await self.session.commit()
        return CustomerRead.model_validate(item)

    async def get(self, tenant_id: uuid.UUID, customer_id: uuid.UUID) -> CustomerRead:
        item = await self.service.get(tenant_id, customer_id)
        if item is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Customer not found")
        return CustomerRead.model_validate(item)

    async def update(
        self, tenant_id: uuid.UUID, customer_id: uuid.UUID, data: CustomerUpdate
    ) -> CustomerRead:
        item = await self.service.update(tenant_id, customer_id, data)
        if item is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Customer not found")
        await self.session.commit()
        return CustomerRead.model_validate(item)

    async def delete(self, tenant_id: uuid.UUID, customer_id: uuid.UUID) -> None:
        ok = await self.service.delete(tenant_id, customer_id)
        if not ok:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Customer not found")
        await self.session.commit()
