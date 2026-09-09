"""auth sessions and security hardening

Revision ID: f3c2a1b4d5e6
Revises: 8a1f4c7d2e90
Create Date: 2026-09-09 19:45:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "f3c2a1b4d5e6"
down_revision: Union[str, Sequence[str], None] = "8a1f4c7d2e90"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "auth_sessions",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("session_key", sa.String(64), nullable=False),
        sa.Column("user_agent", sa.String(500), nullable=True),
        sa.Column("ip_address", sa.String(64), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "last_seen_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.UniqueConstraint("session_key", name="uq_auth_sessions_session_key"),
    )
    op.create_index("ix_auth_sessions_user_id", "auth_sessions", ["user_id"], unique=False)
    op.create_index("ix_auth_sessions_session_key", "auth_sessions", ["session_key"], unique=True)


def downgrade() -> None:
    op.drop_index("ix_auth_sessions_session_key", table_name="auth_sessions")
    op.drop_index("ix_auth_sessions_user_id", table_name="auth_sessions")
    op.drop_table("auth_sessions")
