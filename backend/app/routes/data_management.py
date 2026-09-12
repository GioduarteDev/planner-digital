from pathlib import Path

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models import (
    Agenda,
    CanvasElement,
    Category,
    Event,
    Folder,
    MediaLibraryItem,
    Page,
    PageBlock,
    PageMedia,
    PageTemplate,
    Project,
    Reminder,
    StationeryKit,
    StudySession,
    Subject,
    Task,
    User,
    UserPreset,
)
from app.schemas import StorageSummaryResponse

router = APIRouter(prefix="/data", tags=["Dados e armazenamento"])
UPLOAD_ROOT = Path(__file__).resolve().parents[2] / "uploads"


def _count(db: Session, model, *conditions) -> int:
    return int(
        db.scalar(select(func.count()).select_from(model).where(*conditions)) or 0
    )


def _profile_file_bytes(
    url: str | None,
) -> int:
    if (
        not url
        or not url.startswith("/uploads/")
    ):
        return 0

    relative = url.removeprefix(
        "/uploads/"
    )

    try:
        root = UPLOAD_ROOT.resolve()
        path = (
            UPLOAD_ROOT
            / relative
        ).resolve()

        path.relative_to(root)

        if not path.is_file():
            return 0

        return path.stat().st_size

    except (
        OSError,
        ValueError,
    ):
        return 0


@router.get("/storage", response_model=StorageSummaryResponse)
def storage_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    agenda_ids = select(Agenda.id).where(Agenda.user_id == current_user.id)
    page_ids = select(Page.id).where(Page.agenda_id.in_(agenda_ids))
    library_bytes = int(
        db.scalar(
            select(func.coalesce(func.sum(MediaLibraryItem.size_bytes), 0)).where(
                MediaLibraryItem.user_id == current_user.id
            )
        ) or 0
    )
    page_media_bytes = int(
        db.scalar(
            select(func.coalesce(func.sum(PageMedia.size_bytes), 0)).where(
                PageMedia.page_id.in_(page_ids)
            )
        ) or 0
    )
    template_bytes = 0
    templates = db.scalars(
        select(PageTemplate).where(PageTemplate.user_id == current_user.id)
    ).all()
    for template in templates:
        data = template.template_data if isinstance(template.template_data, dict) else {}
        for media in data.get("media", []):
            try:
                template_bytes += int(media.get("size_bytes", 0))
            except (TypeError, ValueError):
                pass

    profile_bytes = (
        _profile_file_bytes(current_user.profile_photo_url)
        + _profile_file_bytes(current_user.profile_cover_url)
    )
    upload_bytes = library_bytes + page_media_bytes + template_bytes + profile_bytes

    return StorageSummaryResponse(
        upload_bytes=upload_bytes,
        upload_megabytes=round(upload_bytes / (1024 * 1024), 2),
        media_library_items=_count(
            db, MediaLibraryItem, MediaLibraryItem.user_id == current_user.id
        ),
        page_media_items=_count(db, PageMedia, PageMedia.page_id.in_(page_ids)),
        templates=_count(db, PageTemplate, PageTemplate.user_id == current_user.id),
        agendas=_count(db, Agenda, Agenda.user_id == current_user.id),
        pages=_count(db, Page, Page.agenda_id.in_(agenda_ids)),
    )


@router.get("/export")
def export_user_data(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Backup lógico JSON. Arquivos binários continuam no diretório uploads."""
    agendas = db.scalars(
        select(Agenda).where(Agenda.user_id == current_user.id).order_by(Agenda.id)
    ).all()
    agenda_ids = [item.id for item in agendas]
    pages = db.scalars(
        select(Page).where(Page.agenda_id.in_(agenda_ids)).order_by(Page.id)
    ).all() if agenda_ids else []

    def row_dict(row, fields):
        result = {}
        for field in fields:
            value = getattr(row, field)
            if hasattr(value, "isoformat"):
                value = value.isoformat()
            result[field] = value
        return result

    return {
        "version": 1,
        "user": row_dict(
            current_user,
            ["id", "email", "name", "username", "bio", "profile_photo_url", "profile_cover_url", "settings", "created_at"],
        ),
        "agendas": [
            row_dict(a, ["id", "title", "cover_color", "cover_image_url", "settings", "created_at"])
            for a in agendas
        ],
        "pages": [
            row_dict(p, ["id", "agenda_id", "folder_id", "position", "title", "content", "favorite", "paper_type", "paper_settings", "created_at"])
            for p in pages
        ],
        "folders": [
            row_dict(f, ["id", "agenda_id", "title", "position", "created_at"])
            for f in (db.scalars(select(Folder).where(Folder.agenda_id.in_(agenda_ids))).all() if agenda_ids else [])
        ],
        "page_blocks": [
            row_dict(b, ["id", "page_id", "block_type", "data", "position", "created_at", "updated_at"])
            for b in (db.scalars(select(PageBlock).where(PageBlock.page_id.in_([p.id for p in pages]))).all() if pages else [])
        ],
        "page_media": [
            row_dict(m, ["id", "page_id", "media_type", "original_name", "mime_type", "size_bytes", "file_url", "x", "y", "width", "height", "rotation", "z_index", "locked", "created_at"])
            for m in (db.scalars(select(PageMedia).where(PageMedia.page_id.in_([p.id for p in pages]))).all() if pages else [])
        ],
        "media_library": [
            row_dict(m, ["id", "media_type", "name", "mime_type", "size_bytes", "file_url", "kit_name", "metadata_json", "created_at"])
            for m in db.scalars(select(MediaLibraryItem).where(MediaLibraryItem.user_id == current_user.id)).all()
        ],
        "page_templates": [
            row_dict(t, ["id", "name", "template_data", "created_at", "updated_at"])
            for t in db.scalars(select(PageTemplate).where(PageTemplate.user_id == current_user.id)).all()
        ],
        "tasks": [
            row_dict(t, ["id", "page_id", "project_id", "category_id", "text", "description", "done", "due_date", "due_at", "priority", "show_in_calendar", "created_at"])
            for t in db.scalars(select(Task).where(Task.user_id == current_user.id)).all()
        ],
        "events": [
            row_dict(e, ["id", "project_id", "category_id", "title", "description", "starts_at", "ends_at", "all_day", "color", "created_at"])
            for e in db.scalars(select(Event).where(Event.user_id == current_user.id)).all()
        ],
        "projects": [
            row_dict(p, ["id", "title", "description", "status", "priority", "color", "due_date", "created_at"])
            for p in db.scalars(select(Project).where(Project.user_id == current_user.id)).all()
        ],
        "categories": [
            row_dict(c, ["id", "name", "color", "created_at"])
            for c in db.scalars(select(Category).where(Category.user_id == current_user.id)).all()
        ],
        "subjects": [
            row_dict(s, ["id", "name", "color", "created_at"])
            for s in db.scalars(select(Subject).where(Subject.user_id == current_user.id)).all()
        ],
        "study_sessions": [
            row_dict(s, ["id", "project_id", "subject_id", "subject", "topic", "study_date", "duration_minutes", "notes", "created_at"])
            for s in db.scalars(select(StudySession).where(StudySession.user_id == current_user.id)).all()
        ],
        "canvas_elements": [
            row_dict(e, ["id", "page_id", "surface_type", "surface_key", "element_type", "asset_original_name", "asset_mime_type", "asset_size_bytes", "asset_url", "x", "y", "width", "height", "rotation", "z_index", "locked", "data", "created_at"])
            for e in db.scalars(select(CanvasElement).where(CanvasElement.user_id == current_user.id)).all()
        ],
        "reminders": [
            row_dict(r, ["id", "event_id", "task_id", "minutes_before", "channel", "enabled", "created_at"])
            for r in db.scalars(select(Reminder).where(Reminder.user_id == current_user.id)).all()
        ],
        "presets": [
            row_dict(p, ["id", "preset_type", "name", "data", "created_at"])
            for p in db.scalars(select(UserPreset).where(UserPreset.user_id == current_user.id)).all()
        ],
        "stationery_kits": [
            row_dict(k, ["id", "name", "description", "data", "created_at"])
            for k in db.scalars(select(StationeryKit).where(StationeryKit.user_id == current_user.id)).all()
        ],
    }
