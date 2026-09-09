"""complete planner backend core

Revision ID: 8a1f4c7d2e90
Revises: 324562c77f4f
Create Date: 2026-09-09 18:30:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "8a1f4c7d2e90"
down_revision: Union[str, Sequence[str], None] = "324562c77f4f"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # =========================
    # USUÁRIO / PERFIL
    # =========================
    op.add_column("users", sa.Column("name", sa.String(120), server_default="", nullable=False))
    op.add_column("users", sa.Column("username", sa.String(50), nullable=True))
    op.add_column("users", sa.Column("bio", sa.Text(), server_default="", nullable=False))
    op.add_column("users", sa.Column("profile_photo_url", sa.String(500), nullable=True))
    op.add_column("users", sa.Column("profile_cover_url", sa.String(500), nullable=True))
    op.add_column(
        "users",
        sa.Column("settings", sa.JSON(), server_default=sa.text("'{}'::json"), nullable=False),
    )
    op.add_column(
        "users",
        sa.Column("updated_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
    )
    op.create_index("ix_users_username", "users", ["username"], unique=True)
    op.alter_column("users", "settings", server_default=None)

    # =========================
    # AGENDAS / PÁGINAS / BIBLIOTECA
    # =========================
    op.create_index("ix_agendas_user_id", "agendas", ["user_id"], unique=False)
    op.add_column("agendas", sa.Column("cover_image_url", sa.String(500), nullable=True))
    op.add_column(
        "agendas",
        sa.Column("settings", sa.JSON(), server_default=sa.text("'{}'::json"), nullable=False),
    )
    op.add_column("agendas", sa.Column("lock_pin_hash", sa.String(255), nullable=True))
    op.add_column(
        "agendas",
        sa.Column("updated_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
    )
    op.alter_column("agendas", "settings", server_default=None)

    op.create_index("ix_pages_agenda_id", "pages", ["agenda_id"], unique=False)
    op.add_column(
        "pages",
        sa.Column("paper_settings", sa.JSON(), server_default=sa.text("'{}'::json"), nullable=False),
    )
    op.add_column(
        "pages",
        sa.Column("updated_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
    )
    op.alter_column("pages", "paper_settings", server_default=None)

    op.add_column(
        "media_library_items",
        sa.Column("metadata_json", sa.JSON(), server_default=sa.text("'{}'::json"), nullable=False),
    )
    op.alter_column("media_library_items", "metadata_json", server_default=None)

    # =========================
    # PROJETOS / CATEGORIAS / MATÉRIAS
    # =========================
    op.create_table(
        "projects",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("title", sa.String(160), nullable=False),
        sa.Column("description", sa.Text(), server_default="", nullable=False),
        sa.Column("status", sa.String(30), server_default="active", nullable=False),
        sa.Column("priority", sa.String(10), server_default="medium", nullable=False),
        sa.Column("color", sa.String(20), server_default="#a8b5a2", nullable=False),
        sa.Column("due_date", sa.Date(), nullable=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
    )
    op.create_index("ix_projects_user_id", "projects", ["user_id"], unique=False)

    op.create_table(
        "categories",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("color", sa.String(20), server_default="#c7b8d6", nullable=False),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.UniqueConstraint("user_id", "name", name="uq_categories_user_name"),
    )
    op.create_index("ix_categories_user_id", "categories", ["user_id"], unique=False)

    op.create_table(
        "subjects",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("color", sa.String(20), server_default="#9fb9cc", nullable=False),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.UniqueConstraint("user_id", "name", name="uq_subjects_user_name"),
    )
    op.create_index("ix_subjects_user_id", "subjects", ["user_id"], unique=False)

    # =========================
    # TAREFAS: tornam-se independentes de página e ganham projeto/categoria
    # =========================
    op.add_column("tasks", sa.Column("user_id", sa.Integer(), nullable=True))
    op.add_column("tasks", sa.Column("project_id", sa.Integer(), nullable=True))
    op.add_column("tasks", sa.Column("category_id", sa.Integer(), nullable=True))
    op.add_column("tasks", sa.Column("description", sa.Text(), server_default="", nullable=False))
    op.add_column("tasks", sa.Column("due_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column(
        "tasks",
        sa.Column("show_in_calendar", sa.Boolean(), server_default=sa.text("true"), nullable=False),
    )
    op.add_column(
        "tasks",
        sa.Column("updated_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
    )

    op.execute(
        """
        UPDATE tasks
        SET user_id = agendas.user_id
        FROM pages, agendas
        WHERE tasks.page_id = pages.id
          AND pages.agenda_id = agendas.id
          AND tasks.user_id IS NULL
        """
    )
    op.execute(
        """
        UPDATE tasks
        SET user_id = (SELECT id FROM users ORDER BY id LIMIT 1)
        WHERE user_id IS NULL
        """
    )
    op.alter_column("tasks", "user_id", existing_type=sa.Integer(), nullable=False)
    op.alter_column("tasks", "page_id", existing_type=sa.Integer(), nullable=True)
    op.create_foreign_key("fk_tasks_user_id", "tasks", "users", ["user_id"], ["id"], ondelete="CASCADE")
    op.create_foreign_key("fk_tasks_project_id", "tasks", "projects", ["project_id"], ["id"], ondelete="SET NULL")
    op.create_foreign_key("fk_tasks_category_id", "tasks", "categories", ["category_id"], ["id"], ondelete="SET NULL")
    op.create_index("ix_tasks_user_id", "tasks", ["user_id"], unique=False)
    op.create_index("ix_tasks_page_id", "tasks", ["page_id"], unique=False)
    op.create_index("ix_tasks_project_id", "tasks", ["project_id"], unique=False)
    op.create_index("ix_tasks_category_id", "tasks", ["category_id"], unique=False)

    # =========================
    # EVENTOS
    # =========================
    op.add_column("events", sa.Column("project_id", sa.Integer(), nullable=True))
    op.add_column("events", sa.Column("category_id", sa.Integer(), nullable=True))
    op.add_column("events", sa.Column("color", sa.String(20), server_default="#a8b5a2", nullable=False))
    op.add_column(
        "events",
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    op.create_foreign_key("fk_events_project_id", "events", "projects", ["project_id"], ["id"], ondelete="SET NULL")
    op.create_foreign_key("fk_events_category_id", "events", "categories", ["category_id"], ["id"], ondelete="SET NULL")
    op.create_index("ix_events_project_id", "events", ["project_id"], unique=False)
    op.create_index("ix_events_category_id", "events", ["category_id"], unique=False)

    # =========================
    # ESTUDOS
    # =========================
    op.add_column("study_sessions", sa.Column("project_id", sa.Integer(), nullable=True))
    op.add_column("study_sessions", sa.Column("subject_id", sa.Integer(), nullable=True))
    op.add_column(
        "study_sessions",
        sa.Column("updated_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
    )
    op.create_foreign_key("fk_study_project_id", "study_sessions", "projects", ["project_id"], ["id"], ondelete="SET NULL")
    op.create_foreign_key("fk_study_subject_id", "study_sessions", "subjects", ["subject_id"], ["id"], ondelete="SET NULL")
    op.create_index("ix_study_sessions_project_id", "study_sessions", ["project_id"], unique=False)
    op.create_index("ix_study_sessions_subject_id", "study_sessions", ["subject_id"], unique=False)

    # =========================
    # CANVAS UNIVERSAL: página, calendário e perfil
    # =========================
    op.create_table(
        "canvas_elements",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("page_id", sa.Integer(), nullable=True),
        sa.Column("surface_type", sa.String(30), nullable=False),
        sa.Column("surface_key", sa.String(120), server_default="", nullable=False),
        sa.Column("element_type", sa.String(40), nullable=False),
        sa.Column("asset_stored_name", sa.String(255), nullable=True, unique=True),
        sa.Column("asset_original_name", sa.String(255), nullable=True),
        sa.Column("asset_mime_type", sa.String(100), nullable=True),
        sa.Column("asset_size_bytes", sa.Integer(), nullable=True),
        sa.Column("asset_url", sa.String(500), nullable=True),
        sa.Column("x", sa.Float(), server_default="40", nullable=False),
        sa.Column("y", sa.Float(), server_default="40", nullable=False),
        sa.Column("width", sa.Float(), server_default="200", nullable=False),
        sa.Column("height", sa.Float(), server_default="120", nullable=False),
        sa.Column("rotation", sa.Float(), server_default="0", nullable=False),
        sa.Column("z_index", sa.Integer(), server_default="0", nullable=False),
        sa.Column("locked", sa.Boolean(), server_default=sa.text("false"), nullable=False),
        sa.Column("data", sa.JSON(), server_default=sa.text("'{}'::json"), nullable=False),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["page_id"], ["pages.id"], ondelete="CASCADE"),
    )
    op.create_index("ix_canvas_elements_user_id", "canvas_elements", ["user_id"], unique=False)
    op.create_index("ix_canvas_elements_page_id", "canvas_elements", ["page_id"], unique=False)
    op.create_index("ix_canvas_elements_surface_type", "canvas_elements", ["surface_type"], unique=False)
    op.create_index("ix_canvas_elements_surface_key", "canvas_elements", ["surface_key"], unique=False)
    op.create_index("ix_canvas_elements_element_type", "canvas_elements", ["element_type"], unique=False)

    # =========================
    # PRESETS / KITS
    # =========================
    op.create_table(
        "user_presets",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("preset_type", sa.String(40), nullable=False),
        sa.Column("name", sa.String(120), nullable=False),
        sa.Column("data", sa.JSON(), server_default=sa.text("'{}'::json"), nullable=False),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
    )
    op.create_index("ix_user_presets_user_id", "user_presets", ["user_id"], unique=False)
    op.create_index("ix_user_presets_preset_type", "user_presets", ["preset_type"], unique=False)

    op.create_table(
        "stationery_kits",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(120), nullable=False),
        sa.Column("description", sa.Text(), server_default="", nullable=False),
        sa.Column("data", sa.JSON(), server_default=sa.text("'{}'::json"), nullable=False),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
    )
    op.create_index("ix_stationery_kits_user_id", "stationery_kits", ["user_id"], unique=False)

    # =========================
    # VÁRIOS LEMBRETES POR EVENTO/TAREFA
    # =========================
    op.create_table(
        "reminders",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("event_id", sa.Integer(), nullable=True),
        sa.Column("task_id", sa.Integer(), nullable=True),
        sa.Column("minutes_before", sa.Integer(), server_default="0", nullable=False),
        sa.Column("channel", sa.String(20), server_default="push", nullable=False),
        sa.Column("enabled", sa.Boolean(), server_default=sa.text("true"), nullable=False),
        sa.Column("sent_for_signature", sa.String(64), nullable=True),
        sa.Column("sent_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["event_id"], ["events.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["task_id"], ["tasks.id"], ondelete="CASCADE"),
    )
    op.create_index("ix_reminders_user_id", "reminders", ["user_id"], unique=False)
    op.create_index("ix_reminders_event_id", "reminders", ["event_id"], unique=False)
    op.create_index("ix_reminders_task_id", "reminders", ["task_id"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_reminders_task_id", table_name="reminders")
    op.drop_index("ix_reminders_event_id", table_name="reminders")
    op.drop_index("ix_reminders_user_id", table_name="reminders")
    op.drop_table("reminders")

    op.drop_index("ix_stationery_kits_user_id", table_name="stationery_kits")
    op.drop_table("stationery_kits")

    op.drop_index("ix_user_presets_preset_type", table_name="user_presets")
    op.drop_index("ix_user_presets_user_id", table_name="user_presets")
    op.drop_table("user_presets")

    op.drop_index("ix_canvas_elements_element_type", table_name="canvas_elements")
    op.drop_index("ix_canvas_elements_surface_key", table_name="canvas_elements")
    op.drop_index("ix_canvas_elements_surface_type", table_name="canvas_elements")
    op.drop_index("ix_canvas_elements_page_id", table_name="canvas_elements")
    op.drop_index("ix_canvas_elements_user_id", table_name="canvas_elements")
    op.drop_table("canvas_elements")

    op.drop_index("ix_study_sessions_subject_id", table_name="study_sessions")
    op.drop_index("ix_study_sessions_project_id", table_name="study_sessions")
    op.drop_constraint("fk_study_subject_id", "study_sessions", type_="foreignkey")
    op.drop_constraint("fk_study_project_id", "study_sessions", type_="foreignkey")
    op.drop_column("study_sessions", "updated_at")
    op.drop_column("study_sessions", "subject_id")
    op.drop_column("study_sessions", "project_id")

    op.drop_index("ix_events_category_id", table_name="events")
    op.drop_index("ix_events_project_id", table_name="events")
    op.drop_constraint("fk_events_category_id", "events", type_="foreignkey")
    op.drop_constraint("fk_events_project_id", "events", type_="foreignkey")
    op.drop_column("events", "updated_at")
    op.drop_column("events", "color")
    op.drop_column("events", "category_id")
    op.drop_column("events", "project_id")

    op.drop_index("ix_tasks_category_id", table_name="tasks")
    op.drop_index("ix_tasks_project_id", table_name="tasks")
    op.drop_index("ix_tasks_page_id", table_name="tasks")
    op.drop_index("ix_tasks_user_id", table_name="tasks")
    op.drop_constraint("fk_tasks_category_id", "tasks", type_="foreignkey")
    op.drop_constraint("fk_tasks_project_id", "tasks", type_="foreignkey")
    op.drop_constraint("fk_tasks_user_id", "tasks", type_="foreignkey")
    # O schema antigo exigia page_id. Um downgrade só é seguro se não existirem tarefas globais.
    op.alter_column("tasks", "page_id", existing_type=sa.Integer(), nullable=False)
    op.drop_column("tasks", "updated_at")
    op.drop_column("tasks", "show_in_calendar")
    op.drop_column("tasks", "due_at")
    op.drop_column("tasks", "description")
    op.drop_column("tasks", "category_id")
    op.drop_column("tasks", "project_id")
    op.drop_column("tasks", "user_id")

    op.drop_index("ix_subjects_user_id", table_name="subjects")
    op.drop_table("subjects")
    op.drop_index("ix_categories_user_id", table_name="categories")
    op.drop_table("categories")
    op.drop_index("ix_projects_user_id", table_name="projects")
    op.drop_table("projects")

    op.drop_column("media_library_items", "metadata_json")
    op.drop_column("pages", "updated_at")
    op.drop_column("pages", "paper_settings")
    op.drop_index("ix_pages_agenda_id", table_name="pages")

    op.drop_column("agendas", "updated_at")
    op.drop_column("agendas", "lock_pin_hash")
    op.drop_column("agendas", "settings")
    op.drop_column("agendas", "cover_image_url")
    op.drop_index("ix_agendas_user_id", table_name="agendas")

    op.drop_index("ix_users_username", table_name="users")
    op.drop_column("users", "updated_at")
    op.drop_column("users", "settings")
    op.drop_column("users", "profile_cover_url")
    op.drop_column("users", "profile_photo_url")
    op.drop_column("users", "bio")
    op.drop_column("users", "username")
    op.drop_column("users", "name")
