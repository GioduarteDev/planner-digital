"""add folders and page organization

Revision ID: 87028be90d9e
Revises: 9e18406d8721
Create Date: 2026-09-02 16:19:38.581630
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.

revision: str = "87028be90d9e"

down_revision: Union[
    str,
    Sequence[str],
    None,
] = "9e18406d8721"

branch_labels: Union[
    str,
    Sequence[str],
    None,
] = None

depends_on: Union[
    str,
    Sequence[str],
    None,
] = None


def upgrade() -> None:
    """Upgrade schema."""

    op.create_table(
        "folders",

        sa.Column(
            "id",
            sa.Integer(),
            nullable=False,
        ),

        sa.Column(
            "agenda_id",
            sa.Integer(),
            nullable=False,
        ),

        sa.Column(
            "title",
            sa.String(length=120),
            nullable=False,
        ),

        sa.Column(
            "position",
            sa.Integer(),
            nullable=False,
        ),

        sa.Column(
            "created_at",
            sa.DateTime(),
            server_default=sa.text(
                "now()"
            ),
            nullable=False,
        ),

        sa.ForeignKeyConstraint(
            ["agenda_id"],
            ["agendas.id"],
            ondelete="CASCADE",
        ),

        sa.PrimaryKeyConstraint(
            "id"
        ),
    )


    op.create_index(
        op.f(
            "ix_folders_agenda_id"
        ),
        "folders",
        ["agenda_id"],
        unique=False,
    )


    op.add_column(
        "pages",

        sa.Column(
            "folder_id",
            sa.Integer(),
            nullable=True,
        ),
    )


    # Primeiro cria a coluna
    # com valor padrão para
    # as páginas que já existem.
    op.add_column(
        "pages",

        sa.Column(
            "position",
            sa.Integer(),
            nullable=False,
            server_default=sa.text(
                "0"
            ),
        ),
    )


    # Depois remove o default
    # temporário do banco.
    op.alter_column(
        "pages",
        "position",
        server_default=None,
    )


    op.create_index(
        op.f(
            "ix_pages_folder_id"
        ),
        "pages",
        ["folder_id"],
        unique=False,
    )


    op.create_foreign_key(
        None,
        "pages",
        "folders",
        ["folder_id"],
        ["id"],
        ondelete="SET NULL",
    )


def downgrade() -> None:
    """Downgrade schema."""

    op.drop_constraint(
        None,
        "pages",
        type_="foreignkey",
    )


    op.drop_index(
        op.f(
            "ix_pages_folder_id"
        ),
        table_name="pages",
    )


    op.drop_column(
        "pages",
        "position",
    )


    op.drop_column(
        "pages",
        "folder_id",
    )


    op.drop_index(
        op.f(
            "ix_folders_agenda_id"
        ),
        table_name="folders",
    )


    op.drop_table(
        "folders"
    )