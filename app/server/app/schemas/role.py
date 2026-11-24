from __future__ import annotations
from pydantic import BaseModel, Field
from datetime import datetime
import uuid

class RoleRead(BaseModel):
    id: uuid.UUID
    name: str
    description: str | None = None
    is_custom: bool = True
    permissions: list[str] = Field(default_factory=list)
    created_at: datetime | None = None
    updated_at: datetime | None = None
    model_config = {'from_attributes': True}

class RoleListResponse(BaseModel):
    roles: list[RoleRead]
