from __future__ import annotations
import uuid
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.role import Role

DEFAULT_ROLE_PERMISSIONS: dict[str, list[str]] = {
    "Owner": [
        "appointments:view","appointments:create","appointments:edit","appointments:delete",
        "customers:view","customers:create","customers:edit","customers:delete",
        "staff:view","staff:create","staff:edit","staff:delete",
        "services:view","services:create","services:edit","services:delete",
        "invoices:view","invoices:create","invoices:edit","invoices:delete",
        "reports:view","reports:export",
        "settings:view","settings:edit",
    ],
    "Admin": [
        "appointments:view","appointments:create","appointments:edit","appointments:delete",
        "customers:view","customers:create","customers:edit","customers:delete",
        "staff:view","staff:create","staff:edit","staff:delete",
        "services:view","services:create","services:edit","services:delete",
        "invoices:view","invoices:create","invoices:edit",
        "reports:view","reports:export",
        "settings:view","settings:edit",
    ],
    "Manager": [
        "appointments:view","appointments:create","appointments:edit",
        "customers:view","customers:create","customers:edit",
        "staff:view","staff:edit",
        "services:view",
        "invoices:view",
        "reports:view",
    ],
    "Staff": [
        "appointments:view","appointments:create","appointments:edit",
        "customers:view",
        "services:view",
    ],
}

DEFAULT_ROLES = [
    ("Owner", "Full system access", False),
    ("Admin", "Administrative access", False),
    ("Manager", "Management access", False),
    ("Staff", "Staff access", False),
]


class RoleService:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def ensure_default_roles(self, tenant_id: uuid.UUID) -> list[Role]:
        rows = (await self.session.execute(select(Role).where(Role.tenant_id == tenant_id))).scalars().all()
        by_name = {r.name: r for r in rows}
        changed = False
        for name, desc, is_custom in DEFAULT_ROLES:
            role = by_name.get(name)
            perms = list(DEFAULT_ROLE_PERMISSIONS.get(name, []))
            if role is None:
                role = Role(tenant_id=tenant_id, name=name, description=desc, is_custom=is_custom, permissions=perms)
                self.session.add(role)
                by_name[name] = role
                changed = True
            elif not role.permissions:
                role.permissions = perms
                changed = True
        if changed:
            await self.session.flush()
        return (await self.session.execute(select(Role).where(Role.tenant_id == tenant_id).order_by(Role.name.asc()))).scalars().all()

    async def get_owner_role(self, tenant_id: uuid.UUID) -> Role | None:
        rows = await self.ensure_default_roles(tenant_id)
        for role in rows:
            if role.name == "Owner":
                return role
        return None

    async def list(self, tenant_id: uuid.UUID):
        return await self.ensure_default_roles(tenant_id)
