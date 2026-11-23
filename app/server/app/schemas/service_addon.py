"""Schemas for service add-ons."""
from __future__ import annotations

import uuid
from datetime import datetime
from decimal import Decimal
from typing import Literal, Optional

from pydantic import BaseModel, Field, model_serializer, model_validator

AddonCategory = Literal["product", "upgrade", "treatment"]


class ServiceAddonCreate(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    description: str = Field(min_length=1, max_length=1000)
    price: Decimal = Field(ge=0, max_digits=10, decimal_places=2)
    duration_minutes: int = Field(ge=0)
    image_url: Optional[str] = Field(default=None, max_length=500)
    is_active: bool = True
    applicable_service_ids: list[uuid.UUID] = Field(default_factory=list)
    applicable_services: list[uuid.UUID] | None = None
    category: AddonCategory = "product"
    display_order: int = 0

    @model_validator(mode="after")
    def _normalize_applicable(self):
        if self.applicable_services is not None and not self.applicable_service_ids:
            self.applicable_service_ids = self.applicable_services
        return self


class ServiceAddonUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=200)
    description: Optional[str] = Field(default=None, min_length=1, max_length=1000)
    price: Optional[Decimal] = Field(default=None, ge=0, max_digits=10, decimal_places=2)
    duration_minutes: Optional[int] = Field(default=None, ge=0)
    image_url: Optional[str] = Field(default=None, max_length=500)
    is_active: Optional[bool] = None
    applicable_service_ids: Optional[list[uuid.UUID]] = None
    applicable_services: Optional[list[uuid.UUID]] = None
    category: Optional[AddonCategory] = None
    display_order: Optional[int] = None

    @model_validator(mode="after")
    def _normalize_applicable(self):
        if self.applicable_services is not None and self.applicable_service_ids is None:
            self.applicable_service_ids = self.applicable_services
        return self


class ServiceAddonRead(BaseModel):
    id: uuid.UUID
    tenant_id: uuid.UUID
    name: str
    description: str
    price: Decimal
    duration_minutes: int
    image_url: Optional[str] = None
    is_active: bool
    applicable_service_ids: list[uuid.UUID] = Field(default_factory=list)
    category: str
    display_order: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}

    @model_serializer(mode="wrap")
    def _serialize(self, handler):
        d = handler(self)
        d["applicable_services"] = d.get("applicable_service_ids", [])
        return d


class ServiceAddonListResponse(BaseModel):
    addons: list[ServiceAddonRead]
    total: int
