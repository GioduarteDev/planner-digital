"""Optional semester metadata and durable inbox conversion receipts."""
from alembic import op
import sqlalchemy as sa

revision = "a924002"
down_revision = "a924001"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("subjects", sa.Column("professor", sa.String(160), nullable=True))
    op.add_column("subjects", sa.Column("semester", sa.String(80), nullable=True))
    op.add_column("inbox_items", sa.Column("processed_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("inbox_items", sa.Column("converted_type", sa.String(20), nullable=True))
    op.add_column("inbox_items", sa.Column("converted_id", sa.Integer(), nullable=True))


def downgrade():
    for column in ("converted_id", "converted_type", "processed_at"):
        op.drop_column("inbox_items", column)
    op.drop_column("subjects", "semester")
    op.drop_column("subjects", "professor")
