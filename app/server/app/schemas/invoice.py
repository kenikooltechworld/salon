"""Schemas for invoices."""
from __future__ import annotations

import uuid
from datetime import datetime
from decimal import Decimal
from typing import Literal, Optional

from pydantic import BaseModel, Field

InvoiceStatus = Literal["draft", "issued", "paid", "cancelled"]


class InvoiceLineItem(BaseModel):
    service_id: str
    service_name: str = Field(max_length=255)
    quantity: Decimal = Field(default=Decimal("1"), ge=1)
    unit_price: Decimal = Field(ge=0)
    total: Decimal = Field(ge=0)


class InvoiceCreate(BaseModel):
    appointment_id: Optional[uuid.UUID] = None
    customer_id: uuid.UUID
    line_items: list[InvoiceLineItem] = Field(min_length=1)
    discount: Decimal = Field(default=Decimal("0"), ge=0)
    tax: Decimal = Field(default=Decimal("0"), ge=0)
    notes: Optional[str] = Field(default=None, max_length=1000)
    due_date: Optional[datetime] = None


class InvoiceUpdate(BaseModel):
    status: Optional[InvoiceStatus] = None
    discount: Optional[Decimal] = Field(default=None, ge=0)
    tax: Optional[Decimal] = Field(default=None, ge=0)
    notes: Optional[str] = Field(default=None, max_length=1000)
    due_date: Optional[datetime] = None
    paid_at: Optional[datetime] = None


class InvoiceRead(BaseModel):
    id: uuid.UUID
    tenant_id: uuid.UUID
    appointment_id: Optional[uuid.UUID] = None
    customer_id: uuid.UUID
    line_items: list[InvoiceLineItem] = Field(default_factory=list)
    subtotal: Decimal
    discount: Decimal
    tax: Decimal
    total: Decimal
    status: str
    due_date: Optional[datetime] = None
    paid_at: Optional[datetime] = None
    notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class InvoiceListResponse(BaseModel):
    invoices: list[InvoiceRead]
    total: int
    page: int
    page_size: int
