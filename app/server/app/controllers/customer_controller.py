"""Customer controller."""
from __future__ import annotations

import uuid

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.schemas.customer import CustomerCreate, CustomerListResponse, CustomerRead, CustomerUpdate
from app.services.customer_service import CustomerService


def _to_read(item) -> CustomerRead:
    data = CustomerRead.model_validate(item).model_dump()
    data["has_portal_access"] = bool(getattr(item, "password_hash", None))
    return CustomerRead.model_validate(data)


class CustomerController:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.service = CustomerService(session)

    async def list(
        self,
        tenant_id: uuid.UUID,
        *,
        status: str | None = None,
        search: str | None = None,
        page: int = 1,
        page_size: int = 20,
    ) -> CustomerListResponse:
        items, total = await self.service.list_customers(
            tenant_id, status=status, search=search, page=page, page_size=page_size
        )
        return CustomerListResponse(
            customers=[_to_read(i) for i in items],
            total=total,
            page=page,
            page_size=page_size,
        )

    async def create(self, tenant_id: uuid.UUID, data: CustomerCreate) -> CustomerRead:
        item = await self.service.create(tenant_id, data)
        await self.session.commit()
        return _to_read(item)

    async def get(self, tenant_id: uuid.UUID, customer_id: uuid.UUID) -> CustomerRead:
        item = await self.service.get(tenant_id, customer_id)
        if item is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Customer not found")
        return _to_read(item)

    async def update(
        self, tenant_id: uuid.UUID, customer_id: uuid.UUID, data: CustomerUpdate
    ) -> CustomerRead:
        item = await self.service.update(tenant_id, customer_id, data)
        if item is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Customer not found")
        await self.session.commit()
        return _to_read(item)

    async def resend_portal_invitation(self, tenant_id: uuid.UUID, customer_id: uuid.UUID) -> dict:
        ok, message = await self.service.resend_portal_invitation(tenant_id, customer_id)
        if not ok and message == "Customer not found":
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=message)
        if not ok:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=message)
        await self.session.commit()
        return {"message": message}
