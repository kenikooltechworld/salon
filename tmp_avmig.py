from pathlib import Path
# create migration file manually to avoid autogenerate DB dependency
p = Path('app/server/alembic/versions/f1a2b3c4d5e6_add_availability_table.py')
p.write_text("""\"\"\"add availability table

Revision ID: f1a2b3c4d5e6
Revises: e7f8a9b0c1d2
Create Date: 2026-11-23
\"\"\"
from __future__ import annotations

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = 'f1a2b3c4d5e6'
down_revision = 'e7f8a9b0c1d2'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'availability',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column('tenant_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('tenants.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('staff_id', sa.String(length=64), nullable=False, index=True),
        sa.Column('day_of_week', sa.Integer(), nullable=True),
        sa.Column('start_time', sa.String(length=8), nullable=False),
        sa.Column('end_time', sa.String(length=8), nullable=False),
        sa.Column('is_recurring', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        sa.Column('effective_from', sa.Date(), nullable=False),
        sa.Column('effective_to', sa.Date(), nullable=True),
        sa.Column('breaks', postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'[]'::jsonb")),
        sa.Column('slot_interval_minutes', sa.Integer(), nullable=False, server_default='30'),
        sa.Column('buffer_time_minutes', sa.Integer(), nullable=False, server_default='15'),
        sa.Column('concurrent_bookings_allowed', sa.Integer(), nullable=False, server_default='1'),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        sa.Column('notes', sa.String(length=500), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
    )
    op.create_index('ix_availability_tenant_staff_active', 'availability', ['tenant_id', 'staff_id', 'is_active'])
    op.create_index('ix_availability_tenant_staff_day', 'availability', ['tenant_id', 'staff_id', 'day_of_week'])


def downgrade() -> None:
    op.drop_index('ix_availability_tenant_staff_day', table_name='availability')
    op.drop_index('ix_availability_tenant_staff_active', table_name='availability')
    op.drop_table('availability')
""", encoding='utf-8')
print('ok')
