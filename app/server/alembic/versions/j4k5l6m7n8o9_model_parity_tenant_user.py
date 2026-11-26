"""Model parity: tenant deletion/recovery and user specialty/lock fields.

Revision ID: j4k5l6m7n8o9
Revises: i3j4k5l6m7n8
Create Date: 2026-11-26
"""
from alembic import op
import sqlalchemy as sa

revision = "j4k5l6m7n8o9"
down_revision = "i3j4k5l6m7n8"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("tenants", sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("tenants", sa.Column("deletion_status", sa.String(length=32), nullable=False, server_default="active"))
    op.add_column("tenants", sa.Column("recovery_token", sa.String(length=255), nullable=True))
    op.create_index("ix_tenants_deletion_status", "tenants", ["deletion_status"])
    op.create_index("ix_tenants_recovery_token", "tenants", ["recovery_token"])

    op.add_column("users", sa.Column("specialty", sa.String(length=100), nullable=True))
    op.add_column("users", sa.Column("last_failed_login", sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    op.drop_column("users", "last_failed_login")
    op.drop_column("users", "specialty")
    op.drop_index("ix_tenants_recovery_token", table_name="tenants")
    op.drop_index("ix_tenants_deletion_status", table_name="tenants")
    op.drop_column("tenants", "recovery_token")
    op.drop_column("tenants", "deletion_status")
    op.drop_column("tenants", "deleted_at")
