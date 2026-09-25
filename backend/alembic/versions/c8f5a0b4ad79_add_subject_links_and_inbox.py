"""add subject links and inbox

Revision ID: c8f5a0b4ad79
Revises: 8a1f4c7d2e90
Create Date: 2026-09-24 00:00:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "c8f5a0b4ad79"
down_revision: Union[str, Sequence[str], None] = "8a1f4c7d2e90"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("tasks", sa.Column("subject_id", sa.Integer(), nullable=True))
    op.create_foreign_key(
        "fk_tasks_subject_id",
        "tasks",
        "subjects",
        ["subject_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_index("ix_tasks_subject_id", "tasks", ["subject_id"], unique=False)

    op.add_column("events", sa.Column("subject_id", sa.Integer(), nullable=True))
    op.create_foreign_key(
        "fk_events_subject_id",
        "events",
        "subjects",
        ["subject_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_index("ix_events_subject_id", "events", ["subject_id"], unique=False)

    op.add_column("projects", sa.Column("subject_id", sa.Integer(), nullable=True))
    op.create_foreign_key(
        "fk_projects_subject_id",
        "projects",
        "subjects",
        ["subject_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_index("ix_projects_subject_id", "projects", ["subject_id"], unique=False)

    op.create_table(
        "inbox_items",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("subject_id", sa.Integer(), nullable=True),
        sa.Column("text", sa.String(300), nullable=False),
        sa.Column("note", sa.Text(), server_default="", nullable=False),
        sa.Column("optional_date", sa.Date(), nullable=True),
        sa.Column("optional_time", sa.Time(), nullable=True),
        sa.Column("status", sa.String(20), server_default="new", nullable=False),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["subject_id"], ["subjects.id"], ondelete="SET NULL"),
    )
    op.create_index("ix_inbox_items_user_id", "inbox_items", ["user_id"], unique=False)
    op.create_index("ix_inbox_items_subject_id", "inbox_items", ["subject_id"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_inbox_items_subject_id", table_name="inbox_items")
    op.drop_index("ix_inbox_items_user_id", table_name="inbox_items")
    op.drop_table("inbox_items")

    op.drop_index("ix_projects_subject_id", table_name="projects")
    op.drop_constraint("fk_projects_subject_id", "projects", type_="foreignkey")
    op.drop_column("projects", "subject_id")

    op.drop_index("ix_events_subject_id", table_name="events")
    op.drop_constraint("fk_events_subject_id", "events", type_="foreignkey")
    op.drop_column("events", "subject_id")

    op.drop_index("ix_tasks_subject_id", table_name="tasks")
    op.drop_constraint("fk_tasks_subject_id", "tasks", type_="foreignkey")
    op.drop_column("tasks", "subject_id")
