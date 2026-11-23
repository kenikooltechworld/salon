"""add customer preferences table

Revision ID: 7b8c9d0e1f2a
Revises: 633dde1f9f94
Create Date: 2026-11-23 17:42:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = '7b8c9d0e1f2a'
down_revision: Union[str, Sequence[str], None] = '633dde1f9f94'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'customer_preferences',
        sa.Column('customer_id', sa.String(length=64), nullable=False),
        sa.Column('preferred_staff_ids', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('preferred_service_ids', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('communication_methods', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('preferred_time_slots', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('language', sa.String(length=10), nullable=False, server_default='en'),
        sa.Column('notes', sa.String(length=1000), nullable=True),
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('tenant_id', sa.UUID(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_customer_preferences_customer_id'), 'customer_preferences', ['customer_id'], unique=False)
    op.create_index(op.f('ix_customer_preferences_tenant_id'), 'customer_preferences', ['tenant_id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_customer_preferences_tenant_id'), table_name='customer_preferences')
    op.drop_index(op.f('ix_customer_preferences_customer_id'), table_name='customer_preferences')
    op.drop_table('customer_preferences')
