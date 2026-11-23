"""Public tenant schemas."""
from __future__ import annotations

import uuid

from pydantic import BaseModel


class PublicTenantRead(BaseModel):
    id: uuid.UUID
    name: str
    subdomain: str
    description: str | None = None
    email: str | None = None
    phone: str | None = None
    logo_url: str | None = None
    primary_color: str | None = None
    secondary_color: str | None = None
    status: str
    is_published: bool
