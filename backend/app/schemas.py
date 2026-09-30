from datetime import date, datetime, time
from datetime import date as DateValue
import json
from typing import Annotated, Any, Literal

from pydantic import (
    AliasChoices,
    AfterValidator,
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


MAX_JSON_BYTES = 64 * 1024


def _validate_bounded_json(
    value: dict[str, Any],
) -> dict[str, Any]:
    try:
        encoded = json.dumps(
            value,
            ensure_ascii=False,
            separators=(",", ":"),
        ).encode("utf-8")
    except (TypeError, ValueError) as exc:
        raise ValueError(
            "O conteúdo precisa ser um JSON válido."
        ) from exc

    if len(encoded) > MAX_JSON_BYTES:
        raise ValueError(
            "O conteúdo JSON excede o limite de 64 KB."
        )

    return value


BoundedJsonDict = Annotated[
    dict[str, Any],
    AfterValidator(_validate_bounded_json),
]


# =========================
# AGENDAS
# =========================

class AgendaCreate(BaseModel):
    title: str = Field(min_length=1, max_length=120)
    cover_color: str = "#f0ece8"
    cover_image_url: str | None = None
    settings: BoundedJsonDict = Field(default_factory=dict)

    model_config = ConfigDict(str_strip_whitespace=True)


class AgendaUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=120)
    cover_color: str | None = None
    cover_image_url: str | None = None
    settings: BoundedJsonDict | None = None

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
    paper_settings: BoundedJsonDict = Field(default_factory=dict)

    model_config = ConfigDict(str_strip_whitespace=True)


class PageUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=200)
    content: str | None = Field(default=None, max_length=100000)
    favorite: bool | None = None
    paper_type: PaperType | None = None
    paper_settings: BoundedJsonDict | None = None

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
    subject_id: int | None = None
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
    subject_id: int | None = None
    category_id: int | None = None
    show_in_calendar: bool | None = None
    page_id: int | None = None

    model_config = ConfigDict(str_strip_whitespace=True)


class TaskResponse(BaseModel):
    completed_at: datetime | None = None
    id: int
    user_id: int
    page_id: int | None
    project_id: int | None
    subject_id: int | None
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
# HÁBITOS
# =========================

class HabitCreate(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    description: str = Field(default="", max_length=3000)
    days_of_week: list[int] = Field(min_length=1, max_length=7)
    time_of_day: time | None = None
    color: str = Field(default="#9CA362", max_length=20)

    @field_validator("days_of_week")
    @classmethod
    def validate_days_of_week(cls, value: list[int]) -> list[int]:
        if any(day < 0 or day > 6 for day in value):
            raise ValueError("Os dias da semana devem estar entre 0 e 6.")

        if len(set(value)) != len(value):
            raise ValueError("Não repita dias da semana.")

        return sorted(value)

    model_config = ConfigDict(str_strip_whitespace=True)


class HabitUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=200)
    description: str | None = Field(default=None, max_length=3000)
    days_of_week: list[int] | None = Field(default=None, min_length=1, max_length=7)
    time_of_day: time | None = None
    color: str | None = Field(default=None, max_length=20)
    active: bool | None = None

    @field_validator("days_of_week")
    @classmethod
    def validate_days_of_week(cls, value: list[int] | None) -> list[int] | None:
        if value is None:
            return None

        if any(day < 0 or day > 6 for day in value):
            raise ValueError("Os dias da semana devem estar entre 0 e 6.")

        if len(set(value)) != len(value):
            raise ValueError("Não repita dias da semana.")

        return sorted(value)

    model_config = ConfigDict(str_strip_whitespace=True)


class HabitResponse(BaseModel):
    id: int
    user_id: int
    name: str
    description: str
    days_of_week: list[int]
    time_of_day: time | None
    color: str
    active: bool
    created_at: datetime
    updated_at: datetime | None = None

    model_config = ConfigDict(from_attributes=True)


class HabitCompletionResponse(BaseModel):
    id: int
    habit_id: int
    completion_date: date
    completed_at: datetime

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
    settings: BoundedJsonDict | None = None

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
    settings: BoundedJsonDict


class DailyEntryUpsert(BaseModel):
    mood: str = Field(default="", max_length=40)
    quick_note: str = Field(default="", max_length=1000)
    music_data: BoundedJsonDict = Field(default_factory=dict)
    reading_data: BoundedJsonDict = Field(default_factory=dict)
    watching_data: BoundedJsonDict = Field(default_factory=dict)
    photo_media_id: int | None = Field(default=None, gt=0)

    model_config = ConfigDict(str_strip_whitespace=True)


class DailyEntryUpdate(BaseModel):
    mood: str | None = Field(default=None, max_length=40)
    quick_note: str | None = Field(default=None, max_length=1000)
    music_data: BoundedJsonDict | None = None
    reading_data: BoundedJsonDict | None = None
    watching_data: BoundedJsonDict | None = None
    photo_media_id: int | None = Field(default=None, gt=0)

    model_config = ConfigDict(str_strip_whitespace=True)

    @model_validator(mode="after")
    def reject_null_content(self):
        required_content = (
            "mood",
            "quick_note",
            "music_data",
            "reading_data",
            "watching_data",
        )
        if any(
            field in self.model_fields_set and getattr(self, field) is None
            for field in required_content
        ):
            raise ValueError("Os campos de conteúdo diário não aceitam null.")
        return self


class DailyEntryResponse(BaseModel):
    id: int
    user_id: int
    entry_date: date
    mood: str
    quick_note: str
    music_data: dict[str, Any]
    reading_data: dict[str, Any]
    watching_data: dict[str, Any]
    photo_media_id: int | None
    created_at: datetime
    updated_at: datetime | None = None

    model_config = ConfigDict(from_attributes=True)


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
    subject_id: int | None = None
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
    subject_id: int | None = None
    category_id: int | None = None
    color: str | None = None


class EventResponse(BaseModel):
    id: int
    user_id: int
    project_id: int | None
    subject_id: int | None
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
    subject: str = Field(validation_alias=AliasChoices("subject_name", "subject"))
    topic: str
    study_date: date
    duration_minutes: int
    notes: str
    created_at: datetime
    updated_at: datetime | None = None

    model_config = ConfigDict(from_attributes=True)


class SubjectCreate(BaseModel):
    professor: str | None = Field(default=None, max_length=160)
    semester: str | None = Field(default=None, max_length=80)
    name: str = Field(min_length=1, max_length=100)
    color: str = "#9fb9cc"
    model_config = ConfigDict(str_strip_whitespace=True)


class SubjectUpdate(BaseModel):
    professor: str | None = Field(default=None, max_length=160)
    semester: str | None = Field(default=None, max_length=80)
    name: str | None = Field(default=None, min_length=1, max_length=100)
    color: str | None = None
    model_config = ConfigDict(str_strip_whitespace=True)


class SubjectResponse(BaseModel):
    professor: str | None = Field(default=None, max_length=160)
    semester: str | None = Field(default=None, max_length=80)
    id: int
    user_id: int
    name: str
    color: str
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


class InboxItemCreate(BaseModel):
    text: str = Field(min_length=1, max_length=300)
    note: str = Field(default="", max_length=2000)
    optional_date: date | None = None
    optional_time: time | None = None
    optional_subject_id: int | None = None
    status: Literal["new", "processed"] = "new"
    model_config = ConfigDict(str_strip_whitespace=True)


class InboxItemUpdate(BaseModel):
    text: str | None = Field(default=None, min_length=1, max_length=300)
    note: str | None = Field(default=None, max_length=2000)
    optional_date: date | None = None
    optional_time: time | None = None
    optional_subject_id: int | None = None
    status: Literal["new", "processed"] | None = None
    model_config = ConfigDict(str_strip_whitespace=True)


class InboxItemResponse(BaseModel):
    processed_at: datetime | None = None
    converted_type: str | None = None
    converted_id: int | None = None
    id: int
    user_id: int
    subject_id: int | None
    text: str
    note: str
    optional_date: date | None
    optional_time: time | None
    status: str
    created_at: datetime
    updated_at: datetime | None = None
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
    subject_id: int | None = None
    model_config = ConfigDict(str_strip_whitespace=True)


class ProjectUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=160)
    description: str | None = Field(default=None, max_length=4000)
    status: ProjectStatus | None = None
    priority: TaskPriority | None = None
    color: str | None = None
    due_date: date | None = None
    subject_id: int | None = None
    model_config = ConfigDict(str_strip_whitespace=True)


class ProjectResponse(BaseModel):
    id: int
    user_id: int
    subject_id: int | None
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
    x: float = Field(default=40, ge=-100000, le=100000, allow_inf_nan=False)
    y: float = Field(default=40, ge=-100000, le=100000, allow_inf_nan=False)
    width: float = Field(default=200, gt=0, le=20000, allow_inf_nan=False)
    height: float = Field(default=120, gt=0, le=20000, allow_inf_nan=False)
    rotation: float = Field(default=0, ge=-36000, le=36000, allow_inf_nan=False)
    z_index: int = Field(default=0, ge=-100000, le=100000)
    locked: bool = False
    data: BoundedJsonDict = Field(default_factory=dict)


class CanvasElementUpdate(BaseModel):
    surface_key: str | None = Field(default=None, max_length=120)
    element_type: str | None = Field(default=None, min_length=1, max_length=40)
    x: float | None = Field(default=None, ge=-100000, le=100000, allow_inf_nan=False)
    y: float | None = Field(default=None, ge=-100000, le=100000, allow_inf_nan=False)
    width: float | None = Field(default=None, gt=0, le=20000, allow_inf_nan=False)
    height: float | None = Field(default=None, gt=0, le=20000, allow_inf_nan=False)
    rotation: float | None = Field(default=None, ge=-36000, le=36000, allow_inf_nan=False)
    z_index: int | None = Field(default=None, ge=-100000, le=100000)
    locked: bool | None = None
    data: BoundedJsonDict | None = None


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
    habit_id: int | None = None
    minutes_before: int = Field(default=0, ge=0, le=525600)
    channel: Literal["push"] = "push"
    enabled: bool = True

    @model_validator(mode="after")
    def validate_target(self):
        targets = (
            int(self.event_id is not None)
            + int(self.task_id is not None)
            + int(self.habit_id is not None)
        )

        if targets != 1:
            raise ValueError(
                "Informe exatamente um event_id, task_id ou habit_id."
            )

        return self


class ReminderUpdate(BaseModel):
    minutes_before: int | None = Field(default=None, ge=0, le=525600)
    enabled: bool | None = None


class ReminderResponse(BaseModel):
    id: int
    user_id: int
    event_id: int | None
    task_id: int | None
    habit_id: int | None
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
    data: BoundedJsonDict = Field(default_factory=dict)
    model_config = ConfigDict(str_strip_whitespace=True)


class UserPresetUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=120)
    data: BoundedJsonDict | None = None
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
    data: BoundedJsonDict = Field(default_factory=dict)
    model_config = ConfigDict(str_strip_whitespace=True)


class StationeryKitUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=120)
    description: str | None = Field(default=None, max_length=2000)
    data: BoundedJsonDict | None = None
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
    target_date: str | None = None
    target_path: str | None = None


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
    folder_ids: list[int] = Field(max_length=400)


class PageReorderRequest(BaseModel):
    folder_id: int | None = None
    page_ids: list[int] = Field(max_length=400)


# =========================
# BLOCOS
# =========================

class PageBlockCreate(BaseModel):
    block_type: BlockType = "text"
    data: BoundedJsonDict = Field(default_factory=dict)


class PageBlockUpdate(BaseModel):
    block_type: BlockType | None = None
    data: BoundedJsonDict | None = None


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
    block_ids: list[int] = Field(max_length=2000)


# =========================
# MÍDIA DE PÁGINA
# =========================

class PageMediaUpdate(BaseModel):
    x: int | None = Field(default=None, ge=-100000, le=100000)
    y: int | None = Field(default=None, ge=-100000, le=100000)
    width: int | None = Field(default=None, ge=1, le=20000)
    height: int | None = Field(default=None, ge=1, le=20000)
    rotation: int | None = Field(default=None, ge=-36000, le=36000)
    z_index: int | None = Field(default=None, ge=-100000, le=100000)
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


class InboxConvert(BaseModel):
    target: Literal["task", "event", "study", "project", "note"]
    date: DateValue | None = None
    starts_at: datetime | None = None
    timezone_offset_minutes: int = Field(default=0, ge=-840, le=840)
    duration_minutes: int | None = Field(default=None, ge=1, le=1440)
    subject: str | None = Field(default=None, min_length=1, max_length=100)
    model_config = ConfigDict(str_strip_whitespace=True)


class WeeklyReviewSave(BaseModel):
    priorities: list[Annotated[str, Field(max_length=300)]] = Field(default_factory=lambda: ["", "", ""], min_length=3, max_length=3)
    reflection: str = Field(default="", max_length=5000)
    goal: str = Field(default="", max_length=500)
    model_config = ConfigDict(str_strip_whitespace=True)


class WeeklyReviewResponse(WeeklyReviewSave):
    week_start: date
    updated_at: datetime | None = None
    model_config = ConfigDict(from_attributes=True)
