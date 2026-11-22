"""add temp registrations

Revision ID: d4e5f6a7b8c9
Revises: c3d4e5f6a7b8
Create Date: 2026-11-22 17:40:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "d4e5f6a7b8c9"
down_revision: Union[str, Sequence[str], None] = "c3d4e5f6a7b8"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "temp_registrations",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("phone", sa.String(length=20), nullable=False),
        sa.Column("salon_name", sa.String(length=255), nullable=False),
        sa.Column("owner_name", sa.String(length=255), nullable=False),
        sa.Column("address", sa.String(length=500), nullable=False),
        sa.Column("bank_account", sa.String(length=50), nullable=True),
        sa.Column("password_hash", sa.String(length=255), nullable=False),
        sa.Column("subdomain", sa.String(length=63), nullable=False),
        sa.Column("verification_code_hash", sa.String(length=255), nullable=False),
        sa.Column("verification_code_expires", sa.DateTime(timezone=True), nullable=False),
        sa.Column("referral_code", sa.String(length=64), nullable=True),
        sa.Column("referral_tenant_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("attempt_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("locked_until", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_temp_registrations_email", "temp_registrations", ["email"], unique=True)
    op.create_index("ix_temp_registrations_subdomain", "temp_registrations", ["subdomain"], unique=True)
    op.create_index("ix_temp_registrations_expires_at", "temp_registrations", ["expires_at"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_temp_registrations_expires_at", table_name="temp_registrations")
    op.drop_index("ix_temp_registrations_subdomain", table_name="temp_registrations")
    op.drop_index("ix_temp_registrations_email", table_name="temp_registrations")
    op.drop_table("temp_registrations")
