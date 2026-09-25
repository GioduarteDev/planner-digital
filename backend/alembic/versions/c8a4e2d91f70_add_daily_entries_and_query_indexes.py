"""add daily entries and query indexes

Revision ID: c8a4e2d91f70
Revises: 1bb9ef4589aa
Create Date: 2026-09-20 00:00:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "c8a4e2d91f70"
down_revision: Union[str, Sequence[str], None] = "1bb9ef4589aa"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "daily_entries",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("entry_date", sa.Date(), nullable=False),
        sa.Column("mood", sa.String(length=40), server_default="", nullable=False),
        sa.Column("quick_note", sa.Text(), server_default="", nullable=False),
        sa.Column("music_data", sa.JSON(), server_default=sa.text("'{}'::json"), nullable=False),
        sa.Column("reading_data", sa.JSON(), server_default=sa.text("'{}'::json"), nullable=False),
        sa.Column("watching_data", sa.JSON(), server_default=sa.text("'{}'::json"), nullable=False),
        sa.Column("photo_media_id", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["photo_media_id"], ["media_library_items.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id", "entry_date", name="uq_daily_entries_user_date"),
    )
    op.create_index("ix_daily_entries_user_id", "daily_entries", ["user_id"])
    op.create_index("ix_daily_entries_photo_media_id", "daily_entries", ["photo_media_id"])
    op.create_index("ix_events_user_starts_at", "events", ["user_id", "starts_at"])
    op.create_index("ix_tasks_user_due_date", "tasks", ["user_id", "due_date"])


def downgrade() -> None:
    op.drop_index("ix_tasks_user_due_date", table_name="tasks")
    op.drop_index("ix_events_user_starts_at", table_name="events")
    op.drop_index("ix_daily_entries_photo_media_id", table_name="daily_entries")
    op.drop_index("ix_daily_entries_user_id", table_name="daily_entries")
    op.drop_table("daily_entries")
