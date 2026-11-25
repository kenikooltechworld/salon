"""add paystack columns to tenant

Revision ID: 220a3773dd25
Revises: 157b2b397c39
Create Date: 2026-11-25 21:37:01.219048

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '220a3773dd25'
down_revision: Union[str, Sequence[str], None] = '157b2b397c39'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('tenants', sa.Column('paystack_subaccount_code', sa.String(length=64), nullable=True))
    op.add_column('tenants', sa.Column('paystack_percentage_charge', sa.Float(), nullable=True))
    op.create_index(op.f('ix_tenants_paystack_subaccount_code'), 'tenants', ['paystack_subaccount_code'], unique=True)


def downgrade() -> None:
    op.drop_index(op.f('ix_tenants_paystack_subaccount_code'), table_name='tenants')
    op.drop_column('tenants', 'paystack_percentage_charge')
    op.drop_column('tenants', 'paystack_subaccount_code')