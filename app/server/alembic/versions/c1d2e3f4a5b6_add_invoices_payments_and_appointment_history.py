"""add invoices payments and appointment history

Revision ID: c1d2e3f4a5b6
Revises: a44a553b6348
Create Date: 2026-11-23 20:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "c1d2e3f4a5b6"
down_revision: Union[str, Sequence[str], None] = "a44a553b6348"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "invoices",
        sa.Column("appointment_id", sa.UUID(), nullable=True),
        sa.Column("customer_id", sa.UUID(), nullable=False),
        sa.Column("line_items", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'[]'::jsonb")),
        sa.Column("subtotal", sa.Numeric(10, 2), nullable=False, server_default="0"),
        sa.Column("discount", sa.Numeric(10, 2), nullable=False, server_default="0"),
        sa.Column("tax", sa.Numeric(10, 2), nullable=False, server_default="0"),
        sa.Column("total", sa.Numeric(10, 2), nullable=False, server_default="0"),
        sa.Column("status", sa.String(length=16), nullable=False, server_default="draft"),
        sa.Column("due_date", sa.DateTime(timezone=True), nullable=True),
        sa.Column("paid_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("tenant_id", sa.UUID(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["tenant_id"], ["tenants.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_invoices_appointment_id"), "invoices", ["appointment_id"], unique=False)
    op.create_index(op.f("ix_invoices_customer_id"), "invoices", ["customer_id"], unique=False)
    op.create_index(op.f("ix_invoices_status"), "invoices", ["status"], unique=False)
    op.create_index(op.f("ix_invoices_tenant_id"), "invoices", ["tenant_id"], unique=False)

    op.create_table(
        "payments",
        sa.Column("customer_id", sa.UUID(), nullable=True),
        sa.Column("invoice_id", sa.UUID(), nullable=True),
        sa.Column("amount", sa.Numeric(10, 2), nullable=False),
        sa.Column("status", sa.String(length=16), nullable=False, server_default="pending"),
        sa.Column("reference", sa.String(length=128), nullable=False),
        sa.Column("gateway", sa.String(length=32), nullable=False, server_default="paystack"),
        sa.Column("payment_method", sa.String(length=32), nullable=False, server_default="paystack"),
        sa.Column("idempotency_key", sa.String(length=128), nullable=True),
        sa.Column("retry_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("max_retries", sa.Integer(), nullable=False, server_default="3"),
        sa.Column("last_retry_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("next_retry_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("metadata", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("tenant_id", sa.UUID(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["tenant_id"], ["tenants.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_payments_customer_id"), "payments", ["customer_id"], unique=False)
    op.create_index(op.f("ix_payments_idempotency_key"), "payments", ["idempotency_key"], unique=False)
    op.create_index(op.f("ix_payments_invoice_id"), "payments", ["invoice_id"], unique=False)
    op.create_index(op.f("ix_payments_reference"), "payments", ["reference"], unique=False)
    op.create_index(op.f("ix_payments_status"), "payments", ["status"], unique=False)
    op.create_index(op.f("ix_payments_tenant_id"), "payments", ["tenant_id"], unique=False)

    op.create_table(
        "appointment_history",
        sa.Column("customer_id", sa.UUID(), nullable=False),
        sa.Column("appointment_id", sa.UUID(), nullable=False),
        sa.Column("service_id", sa.UUID(), nullable=False),
        sa.Column("staff_id", sa.UUID(), nullable=False),
        sa.Column("appointment_date", sa.DateTime(timezone=True), nullable=False),
        sa.Column("duration_minutes", sa.Integer(), nullable=False),
        sa.Column("amount_paid", sa.Numeric(10, 2), nullable=False, server_default="0"),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("rating", sa.Integer(), nullable=True),
        sa.Column("feedback", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("tenant_id", sa.UUID(), nullable=False),
        sa.ForeignKeyConstraint(["tenant_id"], ["tenants.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_appointment_history_appointment_id"), "appointment_history", ["appointment_id"], unique=False)
    op.create_index(op.f("ix_appointment_history_customer_id"), "appointment_history", ["customer_id"], unique=False)
    op.create_index(op.f("ix_appointment_history_service_id"), "appointment_history", ["service_id"], unique=False)
    op.create_index(op.f("ix_appointment_history_staff_id"), "appointment_history", ["staff_id"], unique=False)
    op.create_index(op.f("ix_appointment_history_appointment_date"), "appointment_history", ["appointment_date"], unique=False)
    op.create_index(op.f("ix_appointment_history_tenant_id"), "appointment_history", ["tenant_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_appointment_history_tenant_id"), table_name="appointment_history")
    op.drop_index(op.f("ix_appointment_history_appointment_date"), table_name="appointment_history")
    op.drop_index(op.f("ix_appointment_history_staff_id"), table_name="appointment_history")
    op.drop_index(op.f("ix_appointment_history_service_id"), table_name="appointment_history")
    op.drop_index(op.f("ix_appointment_history_customer_id"), table_name="appointment_history")
    op.drop_index(op.f("ix_appointment_history_appointment_id"), table_name="appointment_history")
    op.drop_table("appointment_history")

    op.drop_index(op.f("ix_payments_tenant_id"), table_name="payments")
    op.drop_index(op.f("ix_payments_status"), table_name="payments")
    op.drop_index(op.f("ix_payments_reference"), table_name="payments")
    op.drop_index(op.f("ix_payments_invoice_id"), table_name="payments")
    op.drop_index(op.f("ix_payments_idempotency_key"), table_name="payments")
    op.drop_index(op.f("ix_payments_customer_id"), table_name="payments")
    op.drop_table("payments")

    op.drop_index(op.f("ix_invoices_tenant_id"), table_name="invoices")
    op.drop_index(op.f("ix_invoices_status"), table_name="invoices")
    op.drop_index(op.f("ix_invoices_customer_id"), table_name="invoices")
    op.drop_index(op.f("ix_invoices_appointment_id"), table_name="invoices")
    op.drop_table("invoices")
