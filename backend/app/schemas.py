from datetime import date, datetime
from typing import Literal

from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
)


TaskPriority = Literal[
    "low",
    "medium",
    "high",
]


# =========================
# AGENDAS
# =========================

class AgendaCreate(BaseModel):
    title: str = Field(
        min_length=1,
        max_length=120,
    )

    cover_color: str = "#f0ece8"

    model_config = ConfigDict(
        str_strip_whitespace=True
    )


class AgendaUpdate(BaseModel):
    title: str | None = Field(
        default=None,
        min_length=1,
        max_length=120,
    )

    cover_color: str | None = None

    model_config = ConfigDict(
        str_strip_whitespace=True
    )


class AgendaResponse(BaseModel):
    id: int
    title: str
    cover_color: str
    created_at: datetime

    model_config = ConfigDict(
        from_attributes=True
    )


# =========================
# PÁGINAS
# =========================

class PageCreate(BaseModel):
    title: str | None = Field(
        default=None,
        min_length=1,
        max_length=200,
    )

    model_config = ConfigDict(
        str_strip_whitespace=True
    )


class PageUpdate(BaseModel):
    title: str | None = Field(
        default=None,
        min_length=1,
        max_length=200,
    )

    content: str | None = None
    favorite: bool | None = None

    model_config = ConfigDict(
        str_strip_whitespace=True
    )


class PageResponse(BaseModel):
    id: int
    agenda_id: int
    title: str
    content: str
    favorite: bool
    created_at: datetime

    model_config = ConfigDict(
        from_attributes=True
    )


# =========================
# TAREFAS
# =========================

class TaskCreate(BaseModel):
    text: str = Field(
        min_length=1,
        max_length=300,
    )

    due_date: date | None = None

    priority: TaskPriority = "medium"

    model_config = ConfigDict(
        str_strip_whitespace=True
    )


class TaskUpdate(BaseModel):
    text: str | None = Field(
        default=None,
        min_length=1,
        max_length=300,
    )

    done: bool | None = None
    due_date: date | None = None
    priority: TaskPriority | None = None

    model_config = ConfigDict(
        str_strip_whitespace=True
    )


class TaskResponse(BaseModel):
    id: int
    page_id: int
    text: str
    done: bool
    due_date: date | None
    priority: str
    created_at: datetime

    model_config = ConfigDict(
        from_attributes=True
    )