"""add staff certification files

Revision ID: b1c2d3e4f5a6
Revises: f6a7b8c9d0e1
Create Date: 2026-11-23 22:40:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "b1c2d3e4f5a6"
down_revision: Union[str, Sequence[str], None] = "f6a7b8c9d0e1"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("staff", sa.Column("certification_files", postgresql.ARRAY(sa.String(length=500)), nullable=True))


def downgrade() -> None:
    op.drop_column("staff", "certification_files")
