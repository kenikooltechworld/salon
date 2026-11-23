"""Add notifications table.

Revision ID: d6e7f8a9b0c1
Revises: c2d3e4f5a6b7
Create Date: 2026-11-23
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "d6e7f8a9b0c1"
down_revision = "c2d3e4f5a6b7"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "notifications",
        sa.Column("recipient_id", sa.UUID(), nullable=False),
        sa.Column("recipient_type", sa.String(length=32), nullable=False, server_default="user"),
        sa.Column("notification_type", sa.String(length=64), nullable=False),
        sa.Column("channel", sa.String(length=16), nullable=False, server_default="in_app"),
        sa.Column("status", sa.String(length=16), nullable=False, server_default="pending"),
        sa.Column("title", sa.String(length=255), nullable=True),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("data", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column("is_read", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("read_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("sent_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("tenant_id", sa.UUID(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["tenant_id"], ["tenants.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_notifications_tenant_id"), "notifications", ["tenant_id"])
    op.create_index(op.f("ix_notifications_recipient_id"), "notifications", ["recipient_id"])
    op.create_index(op.f("ix_notifications_notification_type"), "notifications", ["notification_type"])
    op.create_index(op.f("ix_notifications_status"), "notifications", ["status"])
    op.create_index(op.f("ix_notifications_is_read"), "notifications", ["is_read"])
    op.create_index("ix_notifications_tenant_recipient_created", "notifications", ["tenant_id", "recipient_id", "created_at"])


def downgrade() -> None:
    op.drop_index("ix_notifications_tenant_recipient_created", table_name="notifications")
    op.drop_index(op.f("ix_notifications_is_read"), table_name="notifications")
    op.drop_index(op.f("ix_notifications_status"), table_name="notifications")
    op.drop_index(op.f("ix_notifications_notification_type"), table_name="notifications")
    op.drop_index(op.f("ix_notifications_recipient_id"), table_name="notifications")
    op.drop_index(op.f("ix_notifications_tenant_id"), table_name="notifications")
    op.drop_table("notifications")

