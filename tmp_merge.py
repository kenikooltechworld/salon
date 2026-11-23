from pathlib import Path
# merge heads b94eca3ab899 and f1a2b3c4d5e6
p = Path('app/server/alembic/versions/a1b2c3d4e5f7_merge_availability_and_docs_head.py')
p.write_text("""\"\"\"merge availability and docs head

Revision ID: a1b2c3d4e5f7
Revises: b94eca3ab899, f1a2b3c4d5e6
Create Date: 2026-11-23
\"\"\"
from __future__ import annotations

revision = 'a1b2c3d4e5f7'
down_revision = ('b94eca3ab899', 'f1a2b3c4d5e6')
branch_labels = None
depends_on = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
""", encoding='utf-8')
print('ok')
