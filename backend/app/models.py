from __future__ import annotations

from datetime import (
    date,
    datetime,
)

from sqlalchemy import (
    Boolean,
    Date,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
    func,
)

from sqlalchemy.orm import (
    Mapped,
    mapped_column,
    relationship,
)

from app.database import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(
        primary_key=True
    )

    email: Mapped[str] = mapped_column(
        String(255),
        unique=True,
        index=True,
    )

    password_hash: Mapped[str] = mapped_column(
        String(255)
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        server_default=func.now(),
    )

    agendas: Mapped[list[Agenda]] = relationship(
        back_populates="user"
    )

    events: Mapped[list[Event]] = relationship(
        back_populates="user",
        cascade="all, delete-orphan",
    )

    study_sessions: Mapped[
        list[StudySession]
    ] = relationship(
        back_populates="user",
        cascade="all, delete-orphan",
    )


class Agenda(Base):
    __tablename__ = "agendas"

    id: Mapped[int] = mapped_column(
        primary_key=True
    )

    user_id: Mapped[int | None] = mapped_column(
        ForeignKey(
            "users.id",
            ondelete="CASCADE",
        ),
        nullable=True,
    )

    title: Mapped[str] = mapped_column(
        String(120)
    )

    cover_color: Mapped[str] = mapped_column(
        String(20),
        default="#f0ece8",
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        server_default=func.now(),
    )

    user: Mapped[User | None] = relationship(
        back_populates="agendas"
    )

    pages: Mapped[list[Page]] = relationship(
        back_populates="agenda",
        cascade="all, delete-orphan",
    )

    folders: Mapped[list[Folder]] = relationship(
        back_populates="agenda",
        cascade="all, delete-orphan",
    )


class Folder(Base):
    __tablename__ = "folders"

    id: Mapped[int] = mapped_column(
        primary_key=True
    )

    agenda_id: Mapped[int] = mapped_column(
        ForeignKey(
            "agendas.id",
            ondelete="CASCADE",
        ),
        index=True,
    )

    title: Mapped[str] = mapped_column(
        String(120)
    )

    position: Mapped[int] = mapped_column(
        Integer,
        default=0,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        server_default=func.now(),
    )

    agenda: Mapped[Agenda] = relationship(
        back_populates="folders"
    )

    pages: Mapped[list[Page]] = relationship(
        back_populates="folder",
        passive_deletes=True,
    )


class Page(Base):
    __tablename__ = "pages"

    id: Mapped[int] = mapped_column(
        primary_key=True
    )

    agenda_id: Mapped[int] = mapped_column(
        ForeignKey(
            "agendas.id",
            ondelete="CASCADE",
        )
    )

    folder_id: Mapped[int | None] = mapped_column(
        ForeignKey(
            "folders.id",
            ondelete="SET NULL",
        ),
        nullable=True,
        index=True,
    )

    position: Mapped[int] = mapped_column(
        Integer,
        default=0,
    )

    title: Mapped[str] = mapped_column(
        String(200)
    )

    content: Mapped[str] = mapped_column(
        Text,
        default="",
    )

    favorite: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        server_default=func.now(),
    )

    agenda: Mapped[Agenda] = relationship(
        back_populates="pages"
    )

    folder: Mapped[Folder | None] = relationship(
        back_populates="pages"
    )

    tasks: Mapped[list[Task]] = relationship(
        back_populates="page",
        cascade="all, delete-orphan",
    )


class Task(Base):
    __tablename__ = "tasks"

    id: Mapped[int] = mapped_column(
        primary_key=True
    )

    page_id: Mapped[int] = mapped_column(
        ForeignKey(
            "pages.id",
            ondelete="CASCADE",
        )
    )

    text: Mapped[str] = mapped_column(
        String(300)
    )

    done: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
    )

    due_date: Mapped[date | None] = mapped_column(
        Date,
        nullable=True,
    )

    priority: Mapped[str] = mapped_column(
        String(10),
        default="medium",
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        server_default=func.now(),
    )

    page: Mapped[Page] = relationship(
        back_populates="tasks"
    )


class Event(Base):
    __tablename__ = "events"

    id: Mapped[int] = mapped_column(
        primary_key=True
    )

    user_id: Mapped[int] = mapped_column(
        ForeignKey(
            "users.id",
            ondelete="CASCADE",
        ),
        index=True,
    )

    title: Mapped[str] = mapped_column(
        String(200)
    )

    description: Mapped[str] = mapped_column(
        Text,
        default="",
    )

    starts_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True)
    )

    ends_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    all_day: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
    )

    reminder_minutes: Mapped[int | None] = mapped_column(
        Integer,
        nullable=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
    )

    user: Mapped[User] = relationship(
        back_populates="events"
    )


class StudySession(Base):
    __tablename__ = "study_sessions"

    id: Mapped[int] = mapped_column(
        primary_key=True
    )

    user_id: Mapped[int] = mapped_column(
        ForeignKey(
            "users.id",
            ondelete="CASCADE",
        ),
        index=True,
    )

    subject: Mapped[str] = mapped_column(
        String(100)
    )

    topic: Mapped[str] = mapped_column(
        String(200),
        default="",
    )

    study_date: Mapped[date] = mapped_column(
        Date
    )

    duration_minutes: Mapped[int] = mapped_column(
        Integer
    )

    notes: Mapped[str] = mapped_column(
        Text,
        default="",
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        server_default=func.now(),
    )

    user: Mapped[User] = relationship(
        back_populates="study_sessions"
    )