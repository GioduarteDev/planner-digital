from datetime import date, datetime
from typing import Any, Literal

from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
    field_validator,
    model_validator,
)


TaskPriority = Literal["low", "medium", "high"]
PaperType = Literal["blank", "lined", "grid", "dotted"]
BlockType = Literal["text", "heading", "checkbox", "list"]
MediaType = Literal[
    "image",
    "sticker",
    "stamp",
    "washi",
    "background",
    "frame",
    "icon",
]
CanvasSurfaceType = Literal["page", "calendar", "profile"]
ProjectStatus = Literal["active", "completed", "archived"]
PresetType = Literal[
    "palette",
    "color",
    "text_style",
    "drawing_style",
    "paper_style",
    "component",
]


# =========================
# AGENDAS
# =========================

class AgendaCreate(BaseModel):
    title: str = Field(min_length=1, max_length=120)
    cover_color: str = "#f0ece8"
    cover_image_url: str | None = None
    settings: dict[str, Any] = Field(default_factory=dict)

    model_config = ConfigDict(str_strip_whitespace=True)


class AgendaUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=120)
    cover_color: str | None = None
    cover_image_url: str | None = None
    settings: dict[str, Any] | None = None

    model_config = ConfigDict(str_strip_whitespace=True)


class AgendaResponse(BaseModel):
    id: int
    title: str
    cover_color: str
    cover_image_url: str | None = None
    settings: dict[str, Any] = Field(default_factory=dict)
    locked: bool = False
    created_at: datetime
    updated_at: datetime | None = None

    model_config = ConfigDict(from_attributes=True)


class AgendaPinSet(BaseModel):
    pin: str = Field(min_length=4, max_length=12, pattern=r"^\d+$")


class AgendaPinVerify(BaseModel):
    pin: str = Field(min_length=4, max_length=12, pattern=r"^\d+$")


class AgendaPinResponse(BaseModel):
    locked: bool
    valid: bool | None = None


# =========================
# PÁGINAS
# =========================

class PageCreate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=200)
    paper_type: PaperType = "blank"
    paper_settings: dict[str, Any] = Field(default_factory=dict)

    model_config = ConfigDict(str_strip_whitespace=True)


class PageUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=200)
    content: str | None = None
    favorite: bool | None = None
    paper_type: PaperType | None = None
    paper_settings: dict[str, Any] | None = None

    model_config = ConfigDict(str_strip_whitespace=True)


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
    paper_settings: dict[str, Any] = Field(default_factory=dict)
    created_at: datetime
    updated_at: datetime | None = None

    model_config = ConfigDict(from_attributes=True)


# =========================
# TAREFAS
# =========================

class TaskCreate(BaseModel):
    text: str = Field(min_length=1, max_length=300)
    description: str = Field(default="", max_length=3000)
    due_date: date | None = None
    due_at: datetime | None = None
    priority: TaskPriority = "medium"
    project_id: int | None = None
    category_id: int | None = None
    show_in_calendar: bool = True

    model_config = ConfigDict(str_strip_whitespace=True)


class TaskUpdate(BaseModel):
    text: str | None = Field(default=None, min_length=1, max_length=300)
    description: str | None = Field(default=None, max_length=3000)
    done: bool | None = None
    due_date: date | None = None
    due_at: datetime | None = None
    priority: TaskPriority | None = None
    project_id: int | None = None
    category_id: int | None = None
    show_in_calendar: bool | None = None
    page_id: int | None = None

    model_config = ConfigDict(str_strip_whitespace=True)


class TaskResponse(BaseModel):
    id: int
    user_id: int
    page_id: int | None
    project_id: int | None
    category_id: int | None
    text: str
    description: str
    done: bool
    due_date: date | None
    due_at: datetime | None
    priority: str
    show_in_calendar: bool
    created_at: datetime
    updated_at: datetime | None = None

    model_config = ConfigDict(from_attributes=True)


# =========================
# USUÁRIOS / AUTENTICAÇÃO / PERFIL
# =========================

class UserCreate(BaseModel):
    email: str = Field(min_length=5, max_length=255)
    password: str = Field(min_length=8, max_length=128)
    name: str = Field(default="", max_length=120)
    username: str | None = Field(default=None, min_length=3, max_length=50)

    @field_validator("email")
    @classmethod
    def normalize_email(cls, value: str) -> str:
        email = value.strip().lower()
        if "@" not in email or "." not in email:
            raise ValueError("Digite um e-mail válido.")
        return email

    @field_validator("username")
    @classmethod
    def normalize_username(cls, value: str | None) -> str | None:
        if value is None:
            return None
        username = value.strip().lower().lstrip("@")
        if not username.replace("_", "").replace(".", "").isalnum():
            raise ValueError("Username pode usar letras, números, ponto e underscore.")
        return username


class LoginRequest(BaseModel):
    email: str
    password: str

    @field_validator("email")
    @classmethod
    def normalize_email(cls, value: str) -> str:
        return value.strip().lower()


class UserResponse(BaseModel):
    id: int
    email: str
    name: str = ""
    username: str | None = None
    bio: str = ""
    profile_photo_url: str | None = None
    profile_cover_url: str | None = None
    settings: dict[str, Any] = Field(default_factory=dict)
    created_at: datetime
    updated_at: datetime | None = None

    model_config = ConfigDict(from_attributes=True)


class AuthResponse(BaseModel):
    user: UserResponse


class AuthSessionResponse(BaseModel):
    id: int
    user_agent: str | None = None
    ip_address: str | None = None
    created_at: datetime
    last_seen_at: datetime
    revoked_at: datetime | None = None
    active: bool = True
    current: bool = False

    model_config = ConfigDict(from_attributes=True)


class DeleteAccountRequest(BaseModel):
    password: str = Field(min_length=8, max_length=128)
    confirmation: str = Field(min_length=6, max_length=20)

    @field_validator("confirmation")
    @classmethod
    def validate_confirmation(cls, value: str) -> str:
        if value.strip().upper() != "DELETE":
            raise ValueError("Digite DELETE para confirmar a exclusão da conta.")
        return "DELETE"


class ProfileUpdate(BaseModel):
    name: str | None = Field(default=None, max_length=120)
    username: str | None = Field(default=None, min_length=3, max_length=50)
    bio: str | None = Field(default=None, max_length=1000)

    model_config = ConfigDict(str_strip_whitespace=True)

    @field_validator("username")
    @classmethod
    def normalize_username(cls, value: str | None) -> str | None:
        if value is None:
            return None
        username = value.strip().lower().lstrip("@")
        if not username.replace("_", "").replace(".", "").isalnum():
            raise ValueError("Username pode usar letras, números, ponto e underscore.")
        return username


class SettingsUpdate(BaseModel):
    settings: dict[str, Any]


class ChangePasswordRequest(BaseModel):
    current_password: str = Field(min_length=8, max_length=128)
    new_password: str = Field(min_length=8, max_length=128)


# =========================
# EVENTOS / CALENDÁRIO
# =========================

class EventCreate(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    description: str = Field(default="", max_length=2000)
    starts_at: datetime
    ends_at: datetime | None = None
    all_day: bool = False
    reminder_minutes: int | None = Field(default=None, ge=0, le=10080)
    project_id: int | None = None
    category_id: int | None = None
    color: str = "#a8b5a2"


class EventUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=200)
    description: str | None = Field(default=None, max_length=2000)
    starts_at: datetime | None = None
    ends_at: datetime | None = None
    all_day: bool | None = None
    reminder_minutes: int | None = Field(default=None, ge=0, le=10080)
    project_id: int | None = None
    category_id: int | None = None
    color: str | None = None


class EventResponse(BaseModel):
    id: int
    user_id: int
    project_id: int | None
    category_id: int | None
    title: str
    description: str
    starts_at: datetime
    ends_at: datetime | None
    all_day: bool
    color: str
    reminder_minutes: int | None
    created_at: datetime
    updated_at: datetime | None = None

    model_config = ConfigDict(from_attributes=True)


# =========================
# ESTUDOS / MATÉRIAS
# =========================

class StudySessionCreate(BaseModel):
    subject: str = Field(min_length=1, max_length=100)
    subject_id: int | None = None
    project_id: int | None = None
    topic: str = Field(default="", max_length=200)
    study_date: date
    duration_minutes: int = Field(ge=1, le=1440)
    notes: str = Field(default="", max_length=2000)

    model_config = ConfigDict(str_strip_whitespace=True)


class StudySessionUpdate(BaseModel):
    subject: str | None = Field(default=None, min_length=1, max_length=100)
    subject_id: int | None = None
    project_id: int | None = None
    topic: str | None = Field(default=None, max_length=200)
    study_date: date | None = None
    duration_minutes: int | None = Field(default=None, ge=1, le=1440)
    notes: str | None = Field(default=None, max_length=2000)

    model_config = ConfigDict(str_strip_whitespace=True)


class StudySessionResponse(BaseModel):
    id: int
    user_id: int
    project_id: int | None
    subject_id: int | None
    subject: str
    topic: str
    study_date: date
    duration_minutes: int
    notes: str
    created_at: datetime
    updated_at: datetime | None = None

    model_config = ConfigDict(from_attributes=True)


class SubjectCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    color: str = "#9fb9cc"
    model_config = ConfigDict(str_strip_whitespace=True)


class SubjectUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=100)
    color: str | None = None
    model_config = ConfigDict(str_strip_whitespace=True)


class SubjectResponse(BaseModel):
    id: int
    user_id: int
    name: str
    color: str
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


# =========================
# PROJETOS / CATEGORIAS
# =========================

class ProjectCreate(BaseModel):
    title: str = Field(min_length=1, max_length=160)
    description: str = Field(default="", max_length=4000)
    status: ProjectStatus = "active"
    priority: TaskPriority = "medium"
    color: str = "#a8b5a2"
    due_date: date | None = None
    model_config = ConfigDict(str_strip_whitespace=True)


class ProjectUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=160)
    description: str | None = Field(default=None, max_length=4000)
    status: ProjectStatus | None = None
    priority: TaskPriority | None = None
    color: str | None = None
    due_date: date | None = None
    model_config = ConfigDict(str_strip_whitespace=True)


class ProjectResponse(BaseModel):
    id: int
    user_id: int
    title: str
    description: str
    status: str
    priority: str
    color: str
    due_date: date | None
    created_at: datetime
    updated_at: datetime | None = None
    model_config = ConfigDict(from_attributes=True)


class CategoryCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    color: str = "#c7b8d6"
    model_config = ConfigDict(str_strip_whitespace=True)


class CategoryUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=100)
    color: str | None = None
    model_config = ConfigDict(str_strip_whitespace=True)


class CategoryResponse(BaseModel):
    id: int
    user_id: int
    name: str
    color: str
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


# =========================
# CANVAS / ELEMENTOS LIVRES
# =========================

class CanvasElementCreate(BaseModel):
    surface_type: CanvasSurfaceType
    surface_key: str = Field(default="", max_length=120)
    page_id: int | None = None
    element_type: str = Field(min_length=1, max_length=40)
    x: float = 40
    y: float = 40
    width: float = Field(default=200, gt=0)
    height: float = Field(default=120, gt=0)
    rotation: float = 0
    z_index: int = 0
    locked: bool = False
    data: dict[str, Any] = Field(default_factory=dict)


class CanvasElementUpdate(BaseModel):
    surface_key: str | None = Field(default=None, max_length=120)
    element_type: str | None = Field(default=None, min_length=1, max_length=40)
    x: float | None = None
    y: float | None = None
    width: float | None = Field(default=None, gt=0)
    height: float | None = Field(default=None, gt=0)
    rotation: float | None = None
    z_index: int | None = None
    locked: bool | None = None
    data: dict[str, Any] | None = None


class CanvasElementResponse(BaseModel):
    id: int
    user_id: int
    page_id: int | None
    surface_type: str
    surface_key: str
    element_type: str
    asset_original_name: str | None = None
    asset_mime_type: str | None = None
    asset_size_bytes: int | None = None
    asset_url: str | None = None
    x: float
    y: float
    width: float
    height: float
    rotation: float
    z_index: int
    locked: bool
    data: dict[str, Any]
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)


# =========================
# LEMBRETES MÚLTIPLOS
# =========================

class ReminderCreate(BaseModel):
    event_id: int | None = None
    task_id: int | None = None
    minutes_before: int = Field(default=0, ge=0, le=525600)
    channel: Literal["push"] = "push"
    enabled: bool = True

    @model_validator(mode="after")
    def validate_target(self):
        targets = int(self.event_id is not None) + int(self.task_id is not None)
        if targets != 1:
            raise ValueError("Informe exatamente um event_id ou task_id.")
        return self


class ReminderUpdate(BaseModel):
    minutes_before: int | None = Field(default=None, ge=0, le=525600)
    enabled: bool | None = None


class ReminderResponse(BaseModel):
    id: int
    user_id: int
    event_id: int | None
    task_id: int | None
    minutes_before: int
    channel: str
    enabled: bool
    sent_at: datetime | None
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)


# =========================
# PRESETS / KITS
# =========================

class UserPresetCreate(BaseModel):
    preset_type: PresetType
    name: str = Field(min_length=1, max_length=120)
    data: dict[str, Any] = Field(default_factory=dict)
    model_config = ConfigDict(str_strip_whitespace=True)


class UserPresetUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=120)
    data: dict[str, Any] | None = None
    model_config = ConfigDict(str_strip_whitespace=True)


class UserPresetResponse(BaseModel):
    id: int
    user_id: int
    preset_type: str
    name: str
    data: dict[str, Any]
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)


class StationeryKitCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    description: str = Field(default="", max_length=2000)
    data: dict[str, Any] = Field(default_factory=dict)
    model_config = ConfigDict(str_strip_whitespace=True)


class StationeryKitUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=120)
    description: str | None = Field(default=None, max_length=2000)
    data: dict[str, Any] | None = None
    model_config = ConfigDict(str_strip_whitespace=True)


class StationeryKitResponse(BaseModel):
    id: int
    user_id: int
    name: str
    description: str
    data: dict[str, Any]
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)


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
# PASTAS / REORDENAÇÃO
# =========================

class FolderCreate(BaseModel):
    title: str = Field(min_length=1, max_length=120)
    model_config = ConfigDict(str_strip_whitespace=True)


class FolderUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=120)
    position: int | None = Field(default=None, ge=0)
    model_config = ConfigDict(str_strip_whitespace=True)


class FolderResponse(BaseModel):
    id: int
    agenda_id: int
    title: str
    position: int
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


class FolderReorderRequest(BaseModel):
    folder_ids: list[int]


class PageReorderRequest(BaseModel):
    folder_id: int | None = None
    page_ids: list[int]


# =========================
# BLOCOS
# =========================

class PageBlockCreate(BaseModel):
    block_type: BlockType = "text"
    data: dict[str, Any] = Field(default_factory=dict)


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
    model_config = ConfigDict(from_attributes=True)


class PageBlockReorderRequest(BaseModel):
    block_ids: list[int]


# =========================
# MÍDIA DE PÁGINA
# =========================

class PageMediaUpdate(BaseModel):
    x: int | None = None
    y: int | None = None
    width: int | None = None
    height: int | None = None
    rotation: int | None = None
    z_index: int | None = None
    locked: bool | None = None


class PageMediaResponse(BaseModel):
    id: int
    page_id: int
    media_type: str
    original_name: str
    mime_type: str
    size_bytes: int
    file_url: str
    x: int
    y: int
    width: int
    height: int
    rotation: int
    z_index: int
    locked: bool
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


# =========================
# DADOS / ARMAZENAMENTO
# =========================

class StorageSummaryResponse(BaseModel):
    upload_bytes: int
    upload_megabytes: float
    media_library_items: int
    page_media_items: int
    templates: int
    agendas: int
    pages: int
