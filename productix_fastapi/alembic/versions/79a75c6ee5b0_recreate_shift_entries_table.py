"""Recreate shift_entries table

Revision ID: 79a75c6ee5b0
Revises: f7e9f7cad3e5
Create Date: 2025-10-04 20:02:31.080311

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '79a75c6ee5b0'
down_revision: Union[str, Sequence[str], None] = 'f7e9f7cad3e5'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
