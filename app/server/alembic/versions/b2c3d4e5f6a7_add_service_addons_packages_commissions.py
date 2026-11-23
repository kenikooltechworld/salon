"""Add service addons, packages, commissions.

Revision ID: b2c3d4e5f6a7
Revises: a1b2c3d4e5f6
Create Date: 2026-11-23
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "b2c3d4e5f6a7"
down_revision = "a1b2c3d4e5f6"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "service_addons",
        sa.Column("name", sa.String(length=200), nullable=False),
        sa.Column("description", sa.String(length=1000), nullable=False),
        sa.Column("price", sa.Numeric(precision=10, scale=2), nullable=False),
        sa.Column("duration_minutes", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("image_url", sa.String(length=500), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("applicable_service_ids", postgresql.ARRAY(postgresql.UUID(as_uuid=True)), nullable=False, server_default="{}"),
        sa.Column("category", sa.String(length=32), nullable=False, server_default="product"),
        sa.Column("display_order", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("tenant_id", sa.UUID(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["tenant_id"], ["tenants.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_service_addons_tenant_id"), "service_addons", ["tenant_id"])
    op.create_index(op.f("ix_service_addons_is_active"), "service_addons", ["is_active"])

    op.create_table(
        "service_packages",
        sa.Column("name", sa.String(length=200), nullable=False),
        sa.Column("description", sa.String(length=1000), nullable=True),
        sa.Column("services", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'[]'::jsonb")),
        sa.Column("original_price", sa.Numeric(precision=10, scale=2), nullable=False),
        sa.Column("package_price", sa.Numeric(precision=10, scale=2), nullable=False),
        sa.Column("discount_amount", sa.Numeric(precision=10, scale=2), nullable=False),
        sa.Column("discount_percentage", sa.Numeric(precision=5, scale=2), nullable=False),
        sa.Column("valid_from", sa.DateTime(timezone=True), nullable=True),
        sa.Column("valid_until", sa.DateTime(timezone=True), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("max_bookings_per_customer", sa.Integer(), nullable=True),
        sa.Column("total_bookings_limit", sa.Integer(), nullable=True),
        sa.Column("current_bookings_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("image_url", sa.String(length=500), nullable=True),
        sa.Column("display_order", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("is_featured", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("created_by", sa.UUID(), nullable=True),
        sa.Column("updated_by", sa.UUID(), nullable=True),
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("tenant_id", sa.UUID(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["tenant_id"], ["tenants.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_service_packages_tenant_id"), "service_packages", ["tenant_id"])
    op.create_index(op.f("ix_service_packages_is_active"), "service_packages", ["is_active"])
    op.create_index(op.f("ix_service_packages_is_featured"), "service_packages", ["is_featured"])

    op.create_table(
        "service_commissions",
        sa.Column("staff_id", sa.UUID(), nullable=False),
        sa.Column("appointment_id", sa.UUID(), nullable=False),
        sa.Column("service_id", sa.UUID(), nullable=False),
        sa.Column("service_price", sa.Numeric(precision=10, scale=2), nullable=False),
        sa.Column("commission_percentage", sa.Numeric(precision=5, scale=2), nullable=False),
        sa.Column("commission_amount", sa.Numeric(precision=10, scale=2), nullable=False),
        sa.Column("status", sa.String(length=16), nullable=False, server_default="pending"),
        sa.Column("earned_date", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("paid_date", sa.DateTime(timezone=True), nullable=True),
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("tenant_id", sa.UUID(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["tenant_id"], ["tenants.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("appointment_id", name="uq_service_commissions_appointment_id"),
    )
    op.create_index(op.f("ix_service_commissions_tenant_id"), "service_commissions", ["tenant_id"])
    op.create_index(op.f("ix_service_commissions_staff_id"), "service_commissions", ["staff_id"])
    op.create_index(op.f("ix_service_commissions_appointment_id"), "service_commissions", ["appointment_id"])
    op.create_index(op.f("ix_service_commissions_service_id"), "service_commissions", ["service_id"])
    op.create_index(op.f("ix_service_commissions_status"), "service_commissions", ["status"])


def downgrade() -> None:
    op.drop_index(op.f("ix_service_commissions_status"), table_name="service_commissions")
    op.drop_index(op.f("ix_service_commissions_service_id"), table_name="service_commissions")
    op.drop_index(op.f("ix_service_commissions_appointment_id"), table_name="service_commissions")
    op.drop_index(op.f("ix_service_commissions_staff_id"), table_name="service_commissions")
    op.drop_index(op.f("ix_service_commissions_tenant_id"), table_name="service_commissions")
    op.drop_table("service_commissions")
    op.drop_index(op.f("ix_service_packages_is_featured"), table_name="service_packages")
    op.drop_index(op.f("ix_service_packages_is_active"), table_name="service_packages")
    op.drop_index(op.f("ix_service_packages_tenant_id"), table_name="service_packages")
    op.drop_table("service_packages")
    op.drop_index(op.f("ix_service_addons_is_active"), table_name="service_addons")
    op.drop_index(op.f("ix_service_addons_tenant_id"), table_name="service_addons")
    op.drop_table("service_addons")
