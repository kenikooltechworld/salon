"""add customer portal auth fields

Revision ID: b94eca3ab899
Revises: e7f8a9b0c1d2
Create Date: 2026-11-23 15:19:09.166105

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b94eca3ab899'
down_revision: Union[str, Sequence[str], None] = 'e7f8a9b0c1d2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("customers", sa.Column("password_hash", sa.String(length=255), nullable=True))
    op.add_column("customers", sa.Column("email_verified", sa.Boolean(), nullable=False, server_default=sa.false()))
    op.add_column("customers", sa.Column("phone_verified", sa.Boolean(), nullable=False, server_default=sa.false()))
    op.add_column("customers", sa.Column("last_login", sa.DateTime(timezone=True), nullable=True))
    op.add_column("customers", sa.Column("password_reset_token", sa.String(length=255), nullable=True))
    op.add_column("customers", sa.Column("password_reset_expires", sa.DateTime(timezone=True), nullable=True))
    op.create_index(op.f("ix_customers_password_reset_token"), "customers", ["password_reset_token"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_customers_password_reset_token"), table_name="customers")
    op.drop_column("customers", "password_reset_expires")
    op.drop_column("customers", "password_reset_token")
    op.drop_column("customers", "last_login")
    op.drop_column("customers", "phone_verified")
    op.drop_column("customers", "email_verified")
    op.drop_column("customers", "password_hash")
