"""add staff management tables

Revision ID: c4d5e6f7a8b9
Revises: f6a7b8c9d0e1
Create Date: 2026-11-24 00:00:00.000000
"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = 'c4d5e6f7a8b9'
down_revision = 'f6a7b8c9d0e1'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'roles',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column('tenant_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('tenants.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('name', sa.String(length=100), nullable=False, index=True),
        sa.Column('description', sa.String(length=500), nullable=True),
        sa.Column('is_custom', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        sa.Column('permissions', postgresql.ARRAY(sa.String(length=255)), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    )
    op.create_table(
        'shifts',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column('tenant_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('tenants.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('staff_id', sa.String(length=64), nullable=False, index=True),
        sa.Column('start_time', sa.DateTime(timezone=True), nullable=False, index=True),
        sa.Column('end_time', sa.DateTime(timezone=True), nullable=False, index=True),
        sa.Column('status', sa.String(length=20), nullable=False, server_default='scheduled'),
        sa.Column('labor_cost', sa.Numeric(12,2), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    )
    op.create_index('ix_shifts_status', 'shifts', ['status'])
    op.create_table(
        'time_off_requests',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column('tenant_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('tenants.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('staff_id', sa.String(length=64), nullable=False, index=True),
        sa.Column('start_date', sa.Date(), nullable=False, index=True),
        sa.Column('end_date', sa.Date(), nullable=False, index=True),
        sa.Column('reason', sa.Text(), nullable=False),
        sa.Column('status', sa.String(length=20), nullable=False, server_default='pending'),
        sa.Column('requested_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('reviewed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('reviewed_by', sa.String(length=64), nullable=True),
        sa.Column('denial_reason', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    )
    op.create_index('ix_time_off_requests_status', 'time_off_requests', ['status'])
    op.create_table(
        'attendance_records',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column('tenant_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('tenants.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('staff_id', sa.String(length=64), nullable=False, index=True),
        sa.Column('shift_id', sa.String(length=64), nullable=True, index=True),
        sa.Column('check_in_time', sa.DateTime(timezone=True), nullable=False),
        sa.Column('check_out_time', sa.DateTime(timezone=True), nullable=True),
        sa.Column('date', sa.DateTime(timezone=True), nullable=False, index=True),
        sa.Column('status', sa.String(length=20), nullable=False, server_default='checked_in'),
        sa.Column('hours_worked', sa.Float(), nullable=True),
        sa.Column('break_minutes', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('is_late', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        sa.Column('is_early_departure', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('verified_by', sa.String(length=64), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    )
    op.create_index('ix_attendance_records_status', 'attendance_records', ['status'])
    op.create_table(
        'goals',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column('tenant_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('tenants.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('staff_id', sa.String(length=64), nullable=False, index=True),
        sa.Column('goal_type', sa.String(length=50), nullable=False, index=True),
        sa.Column('target_value', sa.Float(), nullable=False),
        sa.Column('current_value', sa.Float(), nullable=False, server_default='0'),
        sa.Column('period_start', sa.DateTime(timezone=True), nullable=False),
        sa.Column('period_end', sa.DateTime(timezone=True), nullable=False),
        sa.Column('status', sa.String(length=20), nullable=False, server_default='active'),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    )
    op.create_index('ix_goals_status', 'goals', ['status'])
    op.create_table(
        'goal_achievements',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column('tenant_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('tenants.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('goal_id', sa.String(length=64), nullable=False, index=True),
        sa.Column('staff_id', sa.String(length=64), nullable=False, index=True),
        sa.Column('achieved_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('target_value', sa.Float(), nullable=False),
        sa.Column('achieved_value', sa.Float(), nullable=False),
        sa.Column('bonus_earned', sa.Float(), nullable=True),
        sa.Column('incentive_details', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    )
    op.create_table(
        'staff_settings',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column('tenant_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('tenants.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('user_id', sa.String(length=64), nullable=False, index=True),
        sa.Column('first_name', sa.String(length=100), nullable=False),
        sa.Column('last_name', sa.String(length=100), nullable=False),
        sa.Column('phone', sa.String(length=20), nullable=True),
        sa.Column('email_bookings', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        sa.Column('email_reminders', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        sa.Column('email_messages', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        sa.Column('sms_bookings', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        sa.Column('sms_reminders', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        sa.Column('push_bookings', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        sa.Column('push_reminders', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        sa.Column('working_hours_start', sa.String(length=5), nullable=True),
        sa.Column('working_hours_end', sa.String(length=5), nullable=True),
        sa.Column('days_off', postgresql.ARRAY(sa.String(length=20)), nullable=True),
        sa.Column('emergency_contact_name', sa.String(length=100), nullable=True),
        sa.Column('emergency_contact_phone', sa.String(length=20), nullable=True),
        sa.Column('emergency_contact_relationship', sa.String(length=50), nullable=True),
        sa.Column('service_specializations', postgresql.ARRAY(sa.String(length=64)), nullable=True),
        sa.Column('preferred_customer_types', postgresql.ARRAY(sa.String(length=50)), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    )


def downgrade() -> None:
    op.drop_table('staff_settings')
    op.drop_table('goal_achievements')
    op.drop_index('ix_goals_status', table_name='goals')
    op.drop_table('goals')
    op.drop_index('ix_attendance_records_status', table_name='attendance_records')
    op.drop_table('attendance_records')
    op.drop_index('ix_time_off_requests_status', table_name='time_off_requests')
    op.drop_table('time_off_requests')
    op.drop_index('ix_shifts_status', table_name='shifts')
    op.drop_table('shifts')
    op.drop_table('roles')
