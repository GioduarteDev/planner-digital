"""add water tracking to daily entries

Revision ID: a925002
Revises: a925001
Create Date: 2026-10-01 14:35:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "a925002"
down_revision: Union[str, Sequence[str], None] = "a925001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "daily_entries",
        sa.Column("water_ml", sa.Integer(), server_default="0", nullable=False),
    )


def downgrade() -> None:
    op.drop_column("daily_entries", "water_ml")
