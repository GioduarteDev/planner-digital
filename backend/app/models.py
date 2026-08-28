from datetime import date, datetime

from sqlalchemy import (
    Boolean,
    Date,
    DateTime,
    ForeignKey,
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


class Agenda(Base):
    __tablename__ = "agendas"

    id: Mapped[int] = mapped_column(
        primary_key=True
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

    pages: Mapped[list["Page"]] = relationship(
        back_populates="agenda",
        cascade="all, delete-orphan",
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

    agenda: Mapped["Agenda"] = relationship(
        back_populates="pages"
    )

    tasks: Mapped[list["Task"]] = relationship(
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

    page: Mapped["Page"] = relationship(
        back_populates="tasks"
    )