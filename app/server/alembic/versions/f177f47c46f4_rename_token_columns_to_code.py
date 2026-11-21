"""rename token columns to code

Revision ID: f177f47c46f4
Revises: 41acb745c46a
Create Date: 2026-11-21 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op


revision: str = "f177f47c46f4"
down_revision: Union[str, Sequence[str], None] = "41acb745c46a"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.alter_column("users", "password_reset_token", new_column_name="password_reset_code")
    op.alter_column("users", "email_verification_token", new_column_name="email_verification_code")


def downgrade() -> None:
    op.alter_column("users", "password_reset_code", new_column_name="password_reset_token")
    op.alter_column("users", "email_verification_code", new_column_name="email_verification_token")
