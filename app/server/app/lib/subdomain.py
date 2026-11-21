"""Subdomain generation and validation helpers."""
from __future__ import annotations

import re
import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.tenant import Tenant

RESERVED_SUBDOMAINS = {
    "www",
    "api",
    "admin",
    "app",
    "mail",
    "ftp",
    "localhost",
    "staging",
    "dev",
    "test",
    "support",
    "help",
    "docs",
    "blog",
    "status",
    "cdn",
    "assets",
    "static",
}

SUBDOMAIN_PATTERN = re.compile(r"^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]$")


def slugify_subdomain(name: str) -> str:
    """Convert a business name into a valid subdomain slug."""
    slug = name.lower().strip()
    slug = re.sub(r"[^a-z0-9]+", "-", slug)
    slug = slug.strip("-")
    slug = re.sub(r"-{2,}", "-", slug)
    if not slug:
        slug = "tenant"
    if len(slug) > 50:
        slug = slug[:50].rstrip("-")
    if not SUBDOMAIN_PATTERN.match(slug):
        slug = "tenant-" + uuid.uuid4().hex[:6]
    return slug


def is_valid_subdomain(subdomain: str) -> bool:
    if not subdomain or len(subdomain) > 63:
        return False
    if subdomain in RESERVED_SUBDOMAINS:
        return False
    return bool(SUBDOMAIN_PATTERN.match(subdomain))


async def generate_unique_subdomain(session: AsyncSession, base_name: str) -> str:
    """Generate a unique subdomain from a base name, appending suffix if needed."""
    base = slugify_subdomain(base_name)
    if base in RESERVED_SUBDOMAINS:
        base = base + "-biz"

    candidate = base
    suffix = 2
    while True:
        result = await session.execute(
            select(Tenant).where(Tenant.subdomain == candidate)
        )
        if result.scalar_one_or_none() is None:
            return candidate
        candidate = f"{base}-{suffix}"
        suffix += 1
        if suffix > 1000:
            candidate = f"{base}-{uuid.uuid4().hex[:6]}"
            return candidate
