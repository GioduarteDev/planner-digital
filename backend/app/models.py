from __future__ import annotations

from datetime import date, datetime, time

from sqlalchemy import (
    Boolean,
    Date,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    Index,
    JSON,
    String,
    Text,
    Time,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))

    # Perfil
    name: Mapped[str] = mapped_column(String(120), default="", server_default="")
    username: Mapped[str | None] = mapped_column(
        String(50), unique=True, index=True, nullable=True
    )
    bio: Mapped[str] = mapped_column(Text, default="", server_default="")
    profile_photo_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    profile_cover_url: Mapped[str | None] = mapped_column(String(500), nullable=True)

    # Preferências gerais do aplicativo. Ex.: theme, accent_color,
    # interface_scale, reduce_motion, high_contrast, privacy etc.
    settings: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)

    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now()
    )

    agendas: Mapped[list[Agenda]] = relationship(back_populates="user")
    events: Mapped[list[Event]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )
    tasks: Mapped[list[Task]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )
    habits: Mapped[list[Habit]] = relationship(
    back_populates="user", cascade="all, delete-orphan"
    )
    study_sessions: Mapped[list[StudySession]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )
    projects: Mapped[list[Project]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )
    categories: Mapped[list[Category]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )
    subjects: Mapped[list[Subject]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )
    canvas_elements: Mapped[list[CanvasElement]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )
    presets: Mapped[list[UserPreset]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )
    stationery_kits: Mapped[list[StationeryKit]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )
    reminders: Mapped[list[Reminder]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )
    auth_sessions: Mapped[list[AuthSession]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )
    daily_entries: Mapped[list[DailyEntry]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )
    inbox_items: Mapped[list[InboxItem]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )


class AuthSession(Base):
    __tablename__ = "auth_sessions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    session_key: Mapped[str] = mapped_column(String(64), unique=True, nullable=False, index=True)
    user_agent: Mapped[str | None] = mapped_column(String(500), nullable=True)
    ip_address: Mapped[str | None] = mapped_column(String(64), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    last_seen_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    user: Mapped[User] = relationship(back_populates="auth_sessions")

    @property
    def active(self) -> bool:
        return self.revoked_at is None


class Agenda(Base):
    __tablename__ = "agendas"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=True, index=True
    )
    title: Mapped[str] = mapped_column(String(120))
    cover_color: Mapped[str] = mapped_column(
        String(20), default="#f0ece8", server_default="#f0ece8"
    )
    cover_image_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    settings: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)
    lock_pin_hash: Mapped[str | None] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now()
    )

    user: Mapped[User | None] = relationship(back_populates="agendas")
    pages: Mapped[list[Page]] = relationship(
        back_populates="agenda", cascade="all, delete-orphan"
    )
    folders: Mapped[list[Folder]] = relationship(
        back_populates="agenda", cascade="all, delete-orphan"
    )

    @property
    def locked(self) -> bool:
        return self.lock_pin_hash is not None


class Folder(Base):
    __tablename__ = "folders"

    id: Mapped[int] = mapped_column(primary_key=True)
    agenda_id: Mapped[int] = mapped_column(
        ForeignKey("agendas.id", ondelete="CASCADE"), index=True
    )
    title: Mapped[str] = mapped_column(String(120))
    position: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    agenda: Mapped[Agenda] = relationship(back_populates="folders")
    pages: Mapped[list[Page]] = relationship(
        back_populates="folder", passive_deletes=True
    )


class Page(Base):
    __tablename__ = "pages"

    id: Mapped[int] = mapped_column(primary_key=True)
    agenda_id: Mapped[int] = mapped_column(
        ForeignKey("agendas.id", ondelete="CASCADE"), index=True
    )
    folder_id: Mapped[int | None] = mapped_column(
        ForeignKey("folders.id", ondelete="SET NULL"), nullable=True, index=True
    )
    position: Mapped[int] = mapped_column(Integer, default=0)
    title: Mapped[str] = mapped_column(String(200))
    content: Mapped[str] = mapped_column(Text, default="")
    favorite: Mapped[bool] = mapped_column(Boolean, default=False)
    paper_type: Mapped[str] = mapped_column(
        String(20), default="blank", server_default="blank"
    )

    # Configurações profundas do papel. Mantidas em JSON para permitir
    # evoluir o editor sem criar migration para cada ajuste visual.
    # Ex.: background_color, line_color, spacing, opacity, margins,
    # orientation, size, custom_width, custom_height, background_image_url.
    paper_settings: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)

    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now()
    )

    agenda: Mapped[Agenda] = relationship(back_populates="pages")
    folder: Mapped[Folder | None] = relationship(back_populates="pages")
    tasks: Mapped[list[Task]] = relationship(
        back_populates="page", passive_deletes=True
    )
    blocks: Mapped[list[PageBlock]] = relationship(
        back_populates="page", cascade="all, delete-orphan", passive_deletes=True
    )
    media_items: Mapped[list[PageMedia]] = relationship(
        back_populates="page", cascade="all, delete-orphan", passive_deletes=True
    )
    canvas_elements: Mapped[list[CanvasElement]] = relationship(
        back_populates="page", cascade="all, delete-orphan", passive_deletes=True
    )


class PageBlock(Base):
    __tablename__ = "page_blocks"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    page_id: Mapped[int] = mapped_column(
        ForeignKey("pages.id", ondelete="CASCADE"), index=True, nullable=False
    )
    block_type: Mapped[str] = mapped_column(
        String(30), nullable=False, default="text", server_default="text"
    )
    data: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)
    position: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now()
    )

    page: Mapped[Page] = relationship(back_populates="blocks")


class PageMedia(Base):
    __tablename__ = "page_media"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    page_id: Mapped[int] = mapped_column(
        ForeignKey("pages.id", ondelete="CASCADE"), index=True, nullable=False
    )
    media_type: Mapped[str] = mapped_column(
        String(30), nullable=False, default="image", server_default="image"
    )
    original_name: Mapped[str] = mapped_column(String(255), nullable=False)
    stored_name: Mapped[str] = mapped_column(String(255), nullable=False, unique=True)
    mime_type: Mapped[str] = mapped_column(String(100), nullable=False)
    size_bytes: Mapped[int] = mapped_column(Integer, nullable=False)
    file_url: Mapped[str] = mapped_column(String(500), nullable=False)
    x: Mapped[int] = mapped_column(Integer, nullable=False, default=40, server_default="40")
    y: Mapped[int] = mapped_column(Integer, nullable=False, default=40, server_default="40")
    width: Mapped[int] = mapped_column(Integer, nullable=False, default=240, server_default="240")
    height: Mapped[int] = mapped_column(Integer, nullable=False, default=180, server_default="180")
    rotation: Mapped[int] = mapped_column(Integer, nullable=False, default=0, server_default="0")
    z_index: Mapped[int] = mapped_column(Integer, nullable=False, default=0, server_default="0")
    locked: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, server_default="false")
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    page: Mapped[Page] = relationship(back_populates="media_items")


class MediaLibraryItem(Base):
    __tablename__ = "media_library_items"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False
    )
    # image, sticker, stamp, washi, background, frame, icon
    media_type: Mapped[str] = mapped_column(
        String(30), nullable=False, default="sticker", server_default="sticker"
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    stored_name: Mapped[str] = mapped_column(String(255), nullable=False, unique=True)
    mime_type: Mapped[str] = mapped_column(String(100), nullable=False)
    size_bytes: Mapped[int] = mapped_column(Integer, nullable=False)
    file_url: Mapped[str] = mapped_column(String(500), nullable=False)
    kit_name: Mapped[str | None] = mapped_column(String(120), nullable=True, index=True)
    metadata_json: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())


class PageTemplate(Base):
    __tablename__ = "page_templates"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False
    )
    name: Mapped[str] = mapped_column(String(150), nullable=False)
    template_data: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now()
    )


class Project(Base):
    __tablename__ = "projects"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False
    )
    subject_id: Mapped[int | None] = mapped_column(
        ForeignKey("subjects.id", ondelete="SET NULL"), nullable=True, index=True
    )
    title: Mapped[str] = mapped_column(String(160), nullable=False)
    description: Mapped[str] = mapped_column(Text, default="", server_default="")
    status: Mapped[str] = mapped_column(String(30), default="active", server_default="active")
    priority: Mapped[str] = mapped_column(String(10), default="medium", server_default="medium")
    color: Mapped[str] = mapped_column(String(20), default="#a8b5a2", server_default="#a8b5a2")
    due_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now()
    )

    user: Mapped[User] = relationship(back_populates="projects")
    subject: Mapped[Subject | None] = relationship(back_populates="projects")
    tasks: Mapped[list[Task]] = relationship(back_populates="project")
    events: Mapped[list[Event]] = relationship(back_populates="project")
    study_sessions: Mapped[list[StudySession]] = relationship(back_populates="project")


class Category(Base):
    __tablename__ = "categories"
    __table_args__ = (
        UniqueConstraint("user_id", "name", name="uq_categories_user_name"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False
    )
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    color: Mapped[str] = mapped_column(String(20), default="#c7b8d6", server_default="#c7b8d6")
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    user: Mapped[User] = relationship(back_populates="categories")
    tasks: Mapped[list[Task]] = relationship(back_populates="category")
    events: Mapped[list[Event]] = relationship(back_populates="category")


class Subject(Base):
    __tablename__ = "subjects"
    __table_args__ = (
        UniqueConstraint("user_id", "name", name="uq_subjects_user_name"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False
    )
    professor: Mapped[str | None] = mapped_column(String(160), nullable=True)
    semester: Mapped[str | None] = mapped_column(String(80), nullable=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    color: Mapped[str] = mapped_column(String(20), default="#9fb9cc", server_default="#9fb9cc")
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    user: Mapped[User] = relationship(back_populates="subjects")
    study_sessions: Mapped[list[StudySession]] = relationship(back_populates="subject_ref")
    tasks: Mapped[list[Task]] = relationship(back_populates="subject")
    events: Mapped[list[Event]] = relationship(back_populates="subject")
    projects: Mapped[list[Project]] = relationship(back_populates="subject")
    inbox_items: Mapped[list[InboxItem]] = relationship(back_populates="subject")


class InboxItem(Base):
    __tablename__ = "inbox_items"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False
    )
    subject_id: Mapped[int | None] = mapped_column(
        ForeignKey("subjects.id", ondelete="SET NULL"), nullable=True, index=True
    )
    processed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    converted_type: Mapped[str | None] = mapped_column(String(20), nullable=True)
    converted_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    text: Mapped[str] = mapped_column(String(300), nullable=False)
    note: Mapped[str] = mapped_column(Text, default="", server_default="")
    optional_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    optional_time: Mapped[time | None] = mapped_column(Time, nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="new", server_default="new")
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now()
    )

    user: Mapped[User] = relationship(back_populates="inbox_items")
    subject: Mapped[Subject | None] = relationship(back_populates="inbox_items")


class Task(Base):
    __tablename__ = "tasks"
    __table_args__ = (
        Index("ix_tasks_user_due_date", "user_id", "due_date"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False
    )
    page_id: Mapped[int | None] = mapped_column(
        ForeignKey("pages.id", ondelete="CASCADE"), nullable=True, index=True
    )
    project_id: Mapped[int | None] = mapped_column(
        ForeignKey("projects.id", ondelete="SET NULL"), nullable=True, index=True
    )
    subject_id: Mapped[int | None] = mapped_column(
        ForeignKey("subjects.id", ondelete="SET NULL"), nullable=True, index=True
    )
    category_id: Mapped[int | None] = mapped_column(
        ForeignKey("categories.id", ondelete="SET NULL"), nullable=True, index=True
    )
    text: Mapped[str] = mapped_column(String(300))
    description: Mapped[str] = mapped_column(Text, default="", server_default="")
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    done: Mapped[bool] = mapped_column(Boolean, default=False)
    due_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    due_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    priority: Mapped[str] = mapped_column(String(10), default="medium")
    show_in_calendar: Mapped[bool] = mapped_column(
        Boolean, default=True, server_default="true"
    )
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now()
    )

    user: Mapped[User] = relationship(back_populates="tasks")
    page: Mapped[Page | None] = relationship(back_populates="tasks")
    project: Mapped[Project | None] = relationship(back_populates="tasks")
    subject: Mapped[Subject | None] = relationship(back_populates="tasks")
    category: Mapped[Category | None] = relationship(back_populates="tasks")
    reminders: Mapped[list[Reminder]] = relationship(
        back_populates="task", cascade="all, delete-orphan", passive_deletes=True
    )


class Event(Base):
    __tablename__ = "events"
    __table_args__ = (
        Index("ix_events_user_starts_at", "user_id", "starts_at"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    project_id: Mapped[int | None] = mapped_column(
        ForeignKey("projects.id", ondelete="SET NULL"), nullable=True, index=True
    )
    subject_id: Mapped[int | None] = mapped_column(
        ForeignKey("subjects.id", ondelete="SET NULL"), nullable=True, index=True
    )
    category_id: Mapped[int | None] = mapped_column(
        ForeignKey("categories.id", ondelete="SET NULL"), nullable=True, index=True
    )
    title: Mapped[str] = mapped_column(String(200))
    description: Mapped[str] = mapped_column(Text, default="")
    starts_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    ends_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    all_day: Mapped[bool] = mapped_column(Boolean, default=False)
    color: Mapped[str] = mapped_column(String(20), default="#a8b5a2", server_default="#a8b5a2")

    # Compatibilidade com o frontend atual. O sistema novo usa reminders.
    reminder_minutes: Mapped[int | None] = mapped_column(Integer, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    user: Mapped[User] = relationship(back_populates="events")
    project: Mapped[Project | None] = relationship(back_populates="events")
    subject: Mapped[Subject | None] = relationship(back_populates="events")
    category: Mapped[Category | None] = relationship(back_populates="events")
    reminders: Mapped[list[Reminder]] = relationship(
        back_populates="event", cascade="all, delete-orphan", passive_deletes=True
    )


class StudySession(Base):
    __tablename__ = "study_sessions"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    project_id: Mapped[int | None] = mapped_column(
        ForeignKey("projects.id", ondelete="SET NULL"), nullable=True, index=True
    )
    subject_id: Mapped[int | None] = mapped_column(
        ForeignKey("subjects.id", ondelete="SET NULL"), nullable=True, index=True
    )

    # Mantido para compatibilidade com o frontend atual e para sessões avulsas.
    subject: Mapped[str] = mapped_column(String(100))
    topic: Mapped[str] = mapped_column(String(200), default="")
    study_date: Mapped[date] = mapped_column(Date)
    duration_minutes: Mapped[int] = mapped_column(Integer)
    notes: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now()
    )

    user: Mapped[User] = relationship(back_populates="study_sessions")
    project: Mapped[Project | None] = relationship(back_populates="study_sessions")
    subject_ref: Mapped[Subject | None] = relationship(back_populates="study_sessions")

    @property
    def subject_name(self) -> str:
        """The relation is authoritative; free text survives unlinked sessions."""
        return self.subject_ref.name if self.subject_ref is not None else self.subject


class CanvasElement(Base):
    __tablename__ = "canvas_elements"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False
    )
    page_id: Mapped[int | None] = mapped_column(
        ForeignKey("pages.id", ondelete="CASCADE"), nullable=True, index=True
    )

    # page | calendar | profile
    surface_type: Mapped[str] = mapped_column(String(30), index=True, nullable=False)
    # Para calendar: ex. month:2026-09. Para profile: profile.
    # Para page pode ficar vazio; page_id é a referência principal.
    surface_key: Mapped[str] = mapped_column(String(120), default="", server_default="", index=True)

    # text, postit, checkbox, list, line, shape, drawing, stamp,
    # washi, icon, frame, event_widget, task_widget, calendar_widget etc.
    element_type: Mapped[str] = mapped_column(String(40), index=True, nullable=False)

    # Arquivo independente opcional para stickers/fotos/carimbos/washi usados
    # fora de page_media (ex.: calendário e perfil).
    asset_stored_name: Mapped[str | None] = mapped_column(String(255), nullable=True, unique=True)
    asset_original_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    asset_mime_type: Mapped[str | None] = mapped_column(String(100), nullable=True)
    asset_size_bytes: Mapped[int | None] = mapped_column(Integer, nullable=True)
    asset_url: Mapped[str | None] = mapped_column(String(500), nullable=True)

    x: Mapped[float] = mapped_column(Float, default=40.0, server_default="40")
    y: Mapped[float] = mapped_column(Float, default=40.0, server_default="40")
    width: Mapped[float] = mapped_column(Float, default=200.0, server_default="200")
    height: Mapped[float] = mapped_column(Float, default=120.0, server_default="120")
    rotation: Mapped[float] = mapped_column(Float, default=0.0, server_default="0")
    z_index: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    locked: Mapped[bool] = mapped_column(Boolean, default=False, server_default="false")
    data: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now()
    )

    user: Mapped[User] = relationship(back_populates="canvas_elements")
    page: Mapped[Page | None] = relationship(back_populates="canvas_elements")


class DailyEntry(Base):
    __tablename__ = "daily_entries"
    __table_args__ = (
        UniqueConstraint("user_id", "entry_date", name="uq_daily_entries_user_date"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    entry_date: Mapped[date] = mapped_column(Date, nullable=False)
    mood: Mapped[str] = mapped_column(String(40), default="", server_default="")
    quick_note: Mapped[str] = mapped_column(Text, default="", server_default="")
    music_data: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)
    reading_data: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)
    watching_data: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)
    water_ml: Mapped[int] = mapped_column(Integer, default=0, server_default="0", nullable=False)
    photo_media_id: Mapped[int | None] = mapped_column(
        ForeignKey("media_library_items.id", ondelete="SET NULL"), nullable=True, index=True
    )
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now()
    )

    user: Mapped[User] = relationship(back_populates="daily_entries")

class Habit(Base):
    __tablename__ = "habits"
    __table_args__ = (
        Index("ix_habits_user_active", "user_id", "active"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)

    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    name: Mapped[str] = mapped_column(
        String(200),
        nullable=False,
    )

    description: Mapped[str] = mapped_column(
        Text,
        default="",
        server_default="",
    )

    # 0 = segunda-feira ... 6 = domingo
    days_of_week: Mapped[list[int]] = mapped_column(
        JSON,
        default=list,
        nullable=False,
    )

    time_of_day: Mapped[time | None] = mapped_column(
        Time,
        nullable=True,
    )

    color: Mapped[str] = mapped_column(
        String(20),
        default="#9CA362",
        server_default="#9CA362",
    )

    active: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        server_default="true",
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        server_default=func.now(),
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        server_default=func.now(),
        onupdate=func.now(),
    )

    user: Mapped[User] = relationship(
        back_populates="habits",
    )

    completions: Mapped[list[HabitCompletion]] = relationship(
        back_populates="habit",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )

    reminders: Mapped[list[Reminder]] = relationship(
        back_populates="habit",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )
class HabitCompletion(Base):
    __tablename__ = "habit_completions"
    __table_args__ = (
        UniqueConstraint(
            "habit_id",
            "completion_date",
            name="uq_habit_completions_habit_date",
        ),
        Index(
            "ix_habit_completions_habit_date",
            "habit_id",
            "completion_date",
        ),
    )

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
    )

    habit_id: Mapped[int] = mapped_column(
        ForeignKey("habits.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    completion_date: Mapped[date] = mapped_column(
        Date,
        nullable=False,
    )

    completed_at: Mapped[datetime] = mapped_column(
        DateTime,
        server_default=func.now(),
        nullable=False,
    )

    habit: Mapped[Habit] = relationship(
        back_populates="completions",
    )
class UserPreset(Base):
    __tablename__ = "user_presets"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False
    )
    # palette | color | text_style | drawing_style | paper_style | component
    preset_type: Mapped[str] = mapped_column(String(40), index=True, nullable=False)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    data: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now()
    )

    user: Mapped[User] = relationship(back_populates="presets")


class StationeryKit(Base):
    __tablename__ = "stationery_kits"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False
    )
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    description: Mapped[str] = mapped_column(Text, default="", server_default="")
    # Pode conter media_item_ids, palette, fonts, backgrounds e outros presets.
    data: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now()
    )

    user: Mapped[User] = relationship(back_populates="stationery_kits")


class Reminder(Base):
    __tablename__ = "reminders"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False
    )
    event_id: Mapped[int | None] = mapped_column(
        ForeignKey("events.id", ondelete="CASCADE"), nullable=True, index=True
    )
    task_id: Mapped[int | None] = mapped_column(
        ForeignKey("tasks.id", ondelete="CASCADE"), nullable=True, index=True
    )
    habit_id: Mapped[int | None] = mapped_column(
    ForeignKey("habits.id", ondelete="CASCADE"),
    nullable=True,
    index=True,
)
    minutes_before: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    channel: Mapped[str] = mapped_column(String(20), default="push", server_default="push")
    enabled: Mapped[bool] = mapped_column(Boolean, default=True, server_default="true")

    # A assinatura contém horário do alvo + antecedência. Se o evento/tarefa mudar,
    # a assinatura muda e o lembrete pode ser enviado novamente no novo horário.
    sent_for_signature: Mapped[str | None] = mapped_column(String(64), nullable=True)
    sent_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    user: Mapped[User] = relationship(back_populates="reminders")
    event: Mapped[Event | None] = relationship(back_populates="reminders")
    task: Mapped[Task | None] = relationship(back_populates="reminders")
    habit: Mapped[Habit | None] = relationship(back_populates="reminders")



class PushSubscription(Base):
    __tablename__ = "push_subscriptions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False
    )
    endpoint: Mapped[str] = mapped_column(Text, nullable=False, unique=True)
    p256dh: Mapped[str] = mapped_column(Text, nullable=False)
    auth: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class EventReminderDelivery(Base):
    __tablename__ = "event_reminder_deliveries"
    __table_args__ = (
        UniqueConstraint(
            "event_id", "signature", name="uq_event_reminder_delivery_signature"
        ),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    event_id: Mapped[int] = mapped_column(
        ForeignKey("events.id", ondelete="CASCADE"), index=True, nullable=False
    )
    signature: Mapped[str] = mapped_column(String(64), nullable=False)
    sent_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class WeeklyReview(Base):
    __tablename__ = "weekly_reviews"
    __table_args__ = (UniqueConstraint("user_id", "week_start", name="uq_weekly_reviews_user_week"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    week_start: Mapped[date] = mapped_column(Date, nullable=False)
    priorities: Mapped[list] = mapped_column(JSON, default=list, nullable=False)
    reflection: Mapped[str] = mapped_column(Text, default="", server_default="")
    goal: Mapped[str] = mapped_column(String(500), default="", server_default="")
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
