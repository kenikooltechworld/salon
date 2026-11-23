"""add customer preferred services and payment fields

Revision ID: 633dde1f9f94
Revises: a1b2c3d4e5f7
Create Date: 2026-11-23 17:40:31.794922

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = '633dde1f9f94'
down_revision: Union[str, Sequence[str], None] = 'b94eca3ab899'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("customers", sa.Column("preferred_services", postgresql.JSONB(astext_type=sa.Text()), nullable=True, server_default=sa.text("'[]'::jsonb")))
    op.add_column("customers", sa.Column("preferred_payment_method", sa.String(length=50), nullable=True))
    op.add_column("customers", sa.Column("saved_payment_methods", postgresql.JSONB(astext_type=sa.Text()), nullable=True, server_default=sa.text("'[]'::jsonb")))


def downgrade() -> None:
    op.drop_column("customers", "saved_payment_methods")
    op.drop_column("customers", "preferred_payment_method")
    op.drop_column("customers", "preferred_services")
