"""merge notification and token-rename heads

Revision ID: e7f8a9b0c1d2
Revises: d6e7f8a9b0c1, f177f47c46f4
Create Date: 2026-11-23
"""
from typing import Sequence, Union

revision: str = "e7f8a9b0c1d2"
down_revision: Union[str, Sequence[str], None] = ("d6e7f8a9b0c1", "f177f47c46f4")
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
