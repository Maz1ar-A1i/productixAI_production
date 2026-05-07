"""Initial migration for ShiftEntry

Revision ID: f7e9f7cad3e5
Revises: 
Create Date: 2025-10-04 19:54:36.312436

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f7e9f7cad3e5'
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('shift_entries', sa.Column('input_materials', sa.JSON(), nullable=True))
    op.add_column('shift_entries', sa.Column('output_products', sa.JSON(), nullable=True))

def downgrade() -> None:
    op.drop_column('shift_entries', 'output_products')
    op.drop_column('shift_entries', 'input_materials')
