"""add tenant recovery fields

Revision ID: b2c3d4e5f6a7
Revises: ffffc081399c3
Create Date: 2026-11-22 16:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "b2c3d4e5f6a7"
down_revision: Union[str, Sequence[str], None] = "fffc081399c3"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("tenants", sa.Column("recovery_token_hash", sa.String(length=255), nullable=True))
    op.add_column("tenants", sa.Column("recovery_token_expires_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("tenants", sa.Column("recovery_requested_at", sa.DateTime(timezone=True), nullable=True))
    op.create_index("ix_tenants_recovery_token_hash", "tenants", ["recovery_token_hash"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_tenants_recovery_token_hash", table_name="tenants")
    op.drop_column("tenants", "recovery_requested_at")
    op.drop_column("tenants", "recovery_token_expires_at")
    op.drop_column("tenants", "recovery_token_hash")
