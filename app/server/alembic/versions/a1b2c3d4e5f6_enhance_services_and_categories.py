"""Enhance services and categories for production.

Revision ID: a1b2c3d4e5f6
Revises: f6a7b8c9d0e1
Create Date: 2026-11-23
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "a1b2c3d4e5f6"
down_revision = "f6a7b8c9d0e1"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "services",
        sa.Column("staff_ids", postgresql.ARRAY(postgresql.UUID(as_uuid=True)), nullable=False, server_default="{}"),
    )
    op.execute("UPDATE services SET tags = '{}' WHERE tags IS NULL")
    op.execute("UPDATE services SET benefits = '{}' WHERE benefits IS NULL")
    op.alter_column("services", "tags", existing_type=postgresql.ARRAY(sa.String(length=50)), nullable=False, server_default="{}")
    op.alter_column("services", "benefits", existing_type=postgresql.ARRAY(sa.String(length=200)), nullable=False, server_default="{}")
    op.create_index("ix_services_is_active", "services", ["is_active"])
    op.create_index("ix_services_is_published", "services", ["is_published"])
    op.create_index(
        "uq_service_categories_tenant_name_lower",
        "service_categories",
        ["tenant_id", sa.text("lower(name)")],
        unique=True,
    )


def downgrade() -> None:
    op.drop_index("uq_service_categories_tenant_name_lower", table_name="service_categories")
    op.drop_index("ix_services_is_published", table_name="services")
    op.drop_index("ix_services_is_active", table_name="services")
    op.alter_column("services", "benefits", existing_type=postgresql.ARRAY(sa.String(length=200)), nullable=True, server_default=None)
    op.alter_column("services", "tags", existing_type=postgresql.ARRAY(sa.String(length=50)), nullable=True, server_default=None)
    op.drop_column("services", "staff_ids")
