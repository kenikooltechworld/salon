"""Add pricing plans and subscriptions.

Revision ID: g1h2i3j4k5l6
Revises: fffc081399c3
Create Date: 2026-11-26
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "g1h2i3j4k5l6"
down_revision = "fffc081399c3"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "pricing_plans",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("name", sa.String(length=50), nullable=False),
        sa.Column("tier_level", sa.Integer(), nullable=False),
        sa.Column("description", sa.String(length=500), nullable=True),
        sa.Column("monthly_price", sa.Float(), nullable=False, server_default="0"),
        sa.Column("yearly_price", sa.Float(), nullable=False, server_default="0"),
        sa.Column("currency", sa.String(length=8), nullable=False, server_default="NGN"),
        sa.Column("features", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column("trial_days", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("is_trial_plan", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("is_featured", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("paystack_plan_code", sa.String(length=128), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.UniqueConstraint("name", name="uq_pricing_plans_name"),
        sa.UniqueConstraint("tier_level", name="uq_pricing_plans_tier_level"),
    )
    op.create_index("ix_pricing_plans_tier_level", "pricing_plans", ["tier_level"])
    op.create_index("ix_pricing_plans_is_active", "pricing_plans", ["is_active"])

    op.create_table(
        "subscriptions",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False),
        sa.Column("pricing_plan_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("pricing_plans.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("billing_cycle", sa.String(length=16), nullable=False, server_default="monthly"),
        sa.Column("current_period_start", sa.DateTime(timezone=True), nullable=False),
        sa.Column("current_period_end", sa.DateTime(timezone=True), nullable=False),
        sa.Column("next_billing_date", sa.DateTime(timezone=True), nullable=False),
        sa.Column("trial_end", sa.DateTime(timezone=True), nullable=True),
        sa.Column("is_trial", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("status", sa.String(length=32), nullable=False, server_default="trial"),
        sa.Column("subscription_status", sa.String(length=32), nullable=False, server_default="trial"),
        sa.Column("transaction_fee_percentage", sa.Float(), nullable=False, server_default="0"),
        sa.Column("trial_expiry_action_required", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("grace_period_end", sa.DateTime(timezone=True), nullable=True),
        sa.Column("is_in_grace_period", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("paystack_subscription_id", sa.String(length=128), nullable=True),
        sa.Column("paystack_plan_id", sa.String(length=128), nullable=True),
        sa.Column("last_payment_date", sa.DateTime(timezone=True), nullable=True),
        sa.Column("last_payment_amount", sa.Float(), nullable=True),
        sa.Column("failed_payment_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("auto_renew", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("renewal_reminders_sent", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column("canceled_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.UniqueConstraint("tenant_id", name="uq_subscriptions_tenant_id"),
    )
    op.create_index("ix_subscriptions_tenant_id", "subscriptions", ["tenant_id"])
    op.create_index("ix_subscriptions_pricing_plan_id", "subscriptions", ["pricing_plan_id"])
    op.create_index("ix_subscriptions_status", "subscriptions", ["status"])


def downgrade() -> None:
    op.drop_index("ix_subscriptions_status", table_name="subscriptions")
    op.drop_index("ix_subscriptions_pricing_plan_id", table_name="subscriptions")
    op.drop_index("ix_subscriptions_tenant_id", table_name="subscriptions")
    op.drop_table("subscriptions")
    op.drop_index("ix_pricing_plans_is_active", table_name="pricing_plans")
    op.drop_index("ix_pricing_plans_tier_level", table_name="pricing_plans")
    op.drop_table("pricing_plans")
