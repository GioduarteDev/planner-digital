from datetime import (
    date,
    datetime,
)

from typing import Any, Literal

from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
    field_validator,
)


TaskPriority = Literal[
    "low",
    "medium",
    "high",
]

PaperType = Literal[
    "blank",
    "lined",
    "grid",
    "dotted",
]
BlockType = Literal[
    "text",
    "heading",
    "checkbox",
    "list",
]
MediaType = Literal[
    "image",
    "sticker",
]

# =========================
# 
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
    paper_type: PaperType | None = None


    model_config = ConfigDict(
        str_strip_whitespace=True
    )


class PageMoveFolder(BaseModel):
    folder_id: int | None = None


class PageResponse(BaseModel):
    id: int
    agenda_id: int
    folder_id: int | None
    position: int
    title: str
    content: str
    favorite: bool
    paper_type: PaperType
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


# =========================
# USUÁRIOS / AUTENTICAÇÃO
# =========================

class UserCreate(BaseModel):
    email: str = Field(
        min_length=5,
        max_length=255,
    )

    password: str = Field(
        min_length=8,
        max_length=128,
    )

    @field_validator("email")
    @classmethod
    def normalize_email(
        cls,
        value: str,
    ) -> str:
        email = (
            value
            .strip()
            .lower()
        )

        if (
            "@" not in email
            or "." not in email
        ):
            raise ValueError(
                "Digite um e-mail válido."
            )

        return email


class LoginRequest(BaseModel):
    email: str
    password: str

    @field_validator("email")
    @classmethod
    def normalize_email(
        cls,
        value: str,
    ) -> str:
        return (
            value
            .strip()
            .lower()
        )


class UserResponse(BaseModel):
    id: int
    email: str
    created_at: datetime

    model_config = ConfigDict(
        from_attributes=True
    )


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


# =========================
# EVENTOS / CALENDÁRIO
# =========================

class EventCreate(BaseModel):
    title: str = Field(
        min_length=1,
        max_length=200,
    )

    description: str = Field(
        default="",
        max_length=2000,
    )

    starts_at: datetime
    ends_at: datetime | None = None
    all_day: bool = False

    reminder_minutes: int | None = Field(
        default=None,
        ge=0,
        le=10080,
    )


class EventUpdate(BaseModel):
    title: str | None = Field(
        default=None,
        min_length=1,
        max_length=200,
    )

    description: str | None = Field(
        default=None,
        max_length=2000,
    )

    starts_at: datetime | None = None
    ends_at: datetime | None = None
    all_day: bool | None = None

    reminder_minutes: int | None = Field(
        default=None,
        ge=0,
        le=10080,
    )


class EventResponse(BaseModel):
    id: int
    user_id: int
    title: str
    description: str
    starts_at: datetime
    ends_at: datetime | None
    all_day: bool
    reminder_minutes: int | None
    created_at: datetime

    model_config = ConfigDict(
        from_attributes=True
    )


# =========================
# ESTUDOS
# =========================

class StudySessionCreate(BaseModel):
    subject: str = Field(
        min_length=1,
        max_length=100,
    )

    topic: str = Field(
        default="",
        max_length=200,
    )

    study_date: date

    duration_minutes: int = Field(
        ge=1,
        le=1440,
    )

    notes: str = Field(
        default="",
        max_length=2000,
    )

    model_config = ConfigDict(
        str_strip_whitespace=True
    )


class StudySessionUpdate(BaseModel):
    subject: str | None = Field(
        default=None,
        min_length=1,
        max_length=100,
    )

    topic: str | None = Field(
        default=None,
        max_length=200,
    )

    study_date: date | None = None

    duration_minutes: int | None = Field(
        default=None,
        ge=1,
        le=1440,
    )

    notes: str | None = Field(
        default=None,
        max_length=2000,
    )

    model_config = ConfigDict(
        str_strip_whitespace=True
    )


class StudySessionResponse(BaseModel):
    id: int
    user_id: int
    subject: str
    topic: str
    study_date: date
    duration_minutes: int
    notes: str
    created_at: datetime

    model_config = ConfigDict(
        from_attributes=True
    )


# =========================
# BUSCA
# =========================

class SearchResult(BaseModel):
    type: str
    id: int
    title: str
    subtitle: str = ""
    agenda_id: int | None = None
    page_id: int | None = None


# =========================
# PASTAS
# =========================

class FolderCreate(BaseModel):
    title: str = Field(
        min_length=1,
        max_length=120,
    )

    model_config = ConfigDict(
        str_strip_whitespace=True
    )


class FolderUpdate(BaseModel):
    title: str | None = Field(
        default=None,
        min_length=1,
        max_length=120,
    )

    position: int | None = Field(
        default=None,
        ge=0,
    )

    model_config = ConfigDict(
        str_strip_whitespace=True
    )


class FolderResponse(BaseModel):
    id: int
    agenda_id: int
    title: str
    position: int
    created_at: datetime

    model_config = ConfigDict(
        from_attributes=True
    )

# =========================
# REORDENAÇÃO
# =========================

class FolderReorderRequest(BaseModel):
    folder_ids: list[int]


class PageReorderRequest(BaseModel):
    folder_id: int | None = None
    page_ids: list[int]



class PageBlockCreate(BaseModel):
    block_type: BlockType = "text"
    data: dict[str, Any] = Field(
        default_factory=dict,
    )


class PageBlockUpdate(BaseModel):
    block_type: BlockType | None = None
    data: dict[str, Any] | None = None


class PageBlockResponse(BaseModel):
    id: int
    page_id: int
    block_type: BlockType
    data: dict[str, Any]
    position: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(
        from_attributes=True,
    )


class PageBlockReorderRequest(BaseModel):
    block_ids: list[int]



class PageMediaResponse(BaseModel):
    id: int
    page_id: int
    media_type: MediaType
    original_name: str
    mime_type: str
    size_bytes: int
    file_url: str
    created_at: datetime

    model_config = ConfigDict(
        from_attributes=True,
    )