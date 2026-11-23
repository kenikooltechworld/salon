"""merge customer preferences and availability-docs heads

Revision ID: a44a553b6348
Revises: 7b8c9d0e1f2a, a1b2c3d4e5f7
Create Date: 2026-11-23 17:50:46.076480

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a44a553b6348'
down_revision: Union[str, Sequence[str], None] = ('7b8c9d0e1f2a', 'a1b2c3d4e5f7')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
