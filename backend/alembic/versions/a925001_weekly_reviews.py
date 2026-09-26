"""Persist weekly reviews and actual task completion timestamps."""
from alembic import op
import sqlalchemy as sa

revision = "a925001"
down_revision = "a924002"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("tasks", sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True))
    op.create_table(
        "weekly_reviews",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("week_start", sa.Date(), nullable=False),
        sa.Column("priorities", sa.JSON(), nullable=False),
        sa.Column("reflection", sa.Text(), nullable=False, server_default=""),
        sa.Column("goal", sa.String(500), nullable=False, server_default=""),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.UniqueConstraint("user_id", "week_start", name="uq_weekly_reviews_user_week"),
    )
    op.create_index("ix_weekly_reviews_user_id", "weekly_reviews", ["user_id"])


def downgrade():
    op.drop_table("weekly_reviews")
    op.drop_column("tasks", "completed_at")
