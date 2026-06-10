"""add machine binding columns to licenses

Revision ID: b9c3e7d12f45
Revises: 481a06085677
Create Date: 2026-06-10 21:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b9c3e7d12f45'
down_revision: Union[str, Sequence[str], None] = '481a06085677'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add OTP machine-lock columns to licenses table."""
    # Add bound_machine_id — stores the machine ID that first claimed this key
    op.add_column('licenses',
        sa.Column('bound_machine_id', sa.String(length=255), nullable=True, server_default=None)
    )
    # Add first_used_at — timestamp of when the key was first validated
    op.add_column('licenses',
        sa.Column('first_used_at', sa.DateTime(), nullable=True, server_default=None)
    )


def downgrade() -> None:
    """Remove OTP machine-lock columns from licenses table."""
    op.drop_column('licenses', 'first_used_at')
    op.drop_column('licenses', 'bound_machine_id')
