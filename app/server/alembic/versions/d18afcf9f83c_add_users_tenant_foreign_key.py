"""add users tenant foreign key

Revision ID: d18afcf9f83c
Revises: 2679e0ba3157
Create Date: 2026-11-21 00:51:48.485610

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'd18afcf9f83c'
down_revision: Union[str, Sequence[str], None] = '2679e0ba3157'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_foreign_key(
        "fk_users_tenant_id_tenants",
        "users",
        "tenants",
        ["tenant_id"],
        ["id"],
        ondelete="CASCADE",
    )


def downgrade() -> None:
    op.drop_constraint("fk_users_tenant_id_tenants", "users", type_="foreignkey")
