from pathlib import Path
from datetime import date, datetime, timedelta, timezone
from typing import Literal

from fastapi import APIRouter, Depends, Query
from sqlalchemy import case, func, select
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models import (
    Agenda,
    CanvasElement,
    Category,
    DailyEntry,
    Event,
    Folder,
    Habit,
    HabitCompletion,
    InboxItem,
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
    WeeklyReview,
)
from app.schemas import StorageSummaryResponse


router = APIRouter(prefix="/data", tags=["Dados e armazenamento"])
UPLOAD_ROOT = Path(__file__).resolve().parents[2] / "uploads"


def _count(db: Session, model, *conditions) -> int:
    return int(
        db.scalar(
            select(func.count())
            .select_from(model)
            .where(*conditions)
        )
        or 0
    )


def _profile_file_bytes(url: str | None) -> int:
    if not url or not url.startswith("/uploads/"):
        return 0

    relative = url.removeprefix("/uploads/")

    try:
        root = UPLOAD_ROOT.resolve()
        path = (UPLOAD_ROOT / relative).resolve()
        path.relative_to(root)

        if not path.is_file():
            return 0

        return path.stat().st_size
    except (OSError, ValueError):
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
            select(
                func.coalesce(
                    func.sum(MediaLibraryItem.size_bytes),
                    0,
                )
            ).where(
                MediaLibraryItem.user_id == current_user.id
            )
        )
        or 0
    )

    page_media_bytes = int(
        db.scalar(
            select(
                func.coalesce(
                    func.sum(PageMedia.size_bytes),
                    0,
                )
            ).where(
                PageMedia.page_id.in_(page_ids)
            )
        )
        or 0
    )

    template_bytes = 0
    templates = db.scalars(
        select(PageTemplate).where(
            PageTemplate.user_id == current_user.id
        )
    ).all()

    for template in templates:
        data = (
            template.template_data
            if isinstance(template.template_data, dict)
            else {}
        )
        for media in data.get("media", []):
            try:
                template_bytes += int(media.get("size_bytes", 0))
            except (TypeError, ValueError):
                pass

    profile_bytes = (
        _profile_file_bytes(current_user.profile_photo_url)
        + _profile_file_bytes(current_user.profile_cover_url)
    )

    upload_bytes = (
        library_bytes
        + page_media_bytes
        + template_bytes
        + profile_bytes
    )

    return StorageSummaryResponse(
        upload_bytes=upload_bytes,
        upload_megabytes=round(upload_bytes / (1024 * 1024), 2),
        media_library_items=_count(
            db,
            MediaLibraryItem,
            MediaLibraryItem.user_id == current_user.id,
        ),
        page_media_items=_count(
            db,
            PageMedia,
            PageMedia.page_id.in_(page_ids),
        ),
        templates=_count(
            db,
            PageTemplate,
            PageTemplate.user_id == current_user.id,
        ),
        agendas=_count(
            db,
            Agenda,
            Agenda.user_id == current_user.id,
        ),
        pages=_count(
            db,
            Page,
            Page.agenda_id.in_(agenda_ids),
        ),
    )


@router.get("/export")
def export_user_data(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Backup lógico JSON. Arquivos binários continuam no diretório uploads."""

    agendas = db.scalars(
        select(Agenda)
        .where(Agenda.user_id == current_user.id)
        .order_by(Agenda.id)
    ).all()

    agenda_ids = [item.id for item in agendas]

    pages = (
        db.scalars(
            select(Page)
            .where(Page.agenda_id.in_(agenda_ids))
            .order_by(Page.id)
        ).all()
        if agenda_ids
        else []
    )

    def row_dict(row, fields):
        result = {}

        # Explicit safe metadata only; never serialize ORM rows wholesale
        # because models may contain credentials or other private fields.
        fields = list(
            dict.fromkeys(
                [
                    *fields,
                    *(
                        field
                        for field in (
                            "user_id",
                            "updated_at",
                            "stored_name",
                            "asset_stored_name",
                        )
                        if hasattr(row, field)
                    ),
                ]
            )
        )

        for field in fields:
            value = (
                row.subject_name
                if isinstance(row, StudySession) and field == "subject"
                else getattr(row, field)
            )

            if hasattr(value, "isoformat"):
                value = value.isoformat()

            result[field] = value

        return result

    return {
        "version": 3,
        "exported_at": datetime.now(timezone.utc).isoformat(),
        "user": row_dict(
            current_user,
            [
                "id",
                "email",
                "name",
                "username",
                "bio",
                "profile_photo_url",
                "profile_cover_url",
                "settings",
                "created_at",
            ],
        ),
        "agendas": [
            row_dict(
                agenda,
                [
                    "id",
                    "title",
                    "cover_color",
                    "cover_image_url",
                    "settings",
                    "created_at",
                ],
            )
            for agenda in agendas
        ],
        "pages": [
            row_dict(
                page,
                [
                    "id",
                    "agenda_id",
                    "folder_id",
                    "position",
                    "title",
                    "content",
                    "favorite",
                    "paper_type",
                    "paper_settings",
                    "created_at",
                ],
            )
            for page in pages
        ],
        "folders": [
            row_dict(
                folder,
                [
                    "id",
                    "agenda_id",
                    "title",
                    "position",
                    "created_at",
                ],
            )
            for folder in (
                db.scalars(
                    select(Folder).where(
                        Folder.agenda_id.in_(agenda_ids)
                    )
                ).all()
                if agenda_ids
                else []
            )
        ],
        "page_blocks": [
            row_dict(
                block,
                [
                    "id",
                    "page_id",
                    "block_type",
                    "data",
                    "position",
                    "created_at",
                    "updated_at",
                ],
            )
            for block in (
                db.scalars(
                    select(PageBlock).where(
                        PageBlock.page_id.in_([page.id for page in pages])
                    )
                ).all()
                if pages
                else []
            )
        ],
        "page_media": [
            row_dict(
                media,
                [
                    "id",
                    "page_id",
                    "media_type",
                    "original_name",
                    "mime_type",
                    "size_bytes",
                    "file_url",
                    "x",
                    "y",
                    "width",
                    "height",
                    "rotation",
                    "z_index",
                    "locked",
                    "created_at",
                ],
            )
            for media in (
                db.scalars(
                    select(PageMedia).where(
                        PageMedia.page_id.in_([page.id for page in pages])
                    )
                ).all()
                if pages
                else []
            )
        ],
        "media_library": [
            row_dict(
                media,
                [
                    "id",
                    "media_type",
                    "name",
                    "mime_type",
                    "size_bytes",
                    "file_url",
                    "kit_name",
                    "metadata_json",
                    "created_at",
                ],
            )
            for media in db.scalars(
                select(MediaLibraryItem).where(
                    MediaLibraryItem.user_id == current_user.id
                )
            ).all()
        ],
        "page_templates": [
            row_dict(
                template,
                [
                    "id",
                    "name",
                    "template_data",
                    "created_at",
                    "updated_at",
                ],
            )
            for template in db.scalars(
                select(PageTemplate).where(
                    PageTemplate.user_id == current_user.id
                )
            ).all()
        ],
        "tasks": [
            row_dict(
                task,
                [
                    "id",
                    "page_id",
                    "project_id",
                    "category_id",
                    "subject_id",
                    "text",
                    "description",
                    "done",
                    "completed_at",
                    "due_date",
                    "due_at",
                    "priority",
                    "show_in_calendar",
                    "created_at",
                ],
            )
            for task in db.scalars(
                select(Task).where(
                    Task.user_id == current_user.id
                )
            ).all()
        ],
        "events": [
            row_dict(
                event,
                [
                    "id",
                    "project_id",
                    "category_id",
                    "subject_id",
                    "title",
                    "description",
                    "reminder_minutes",
                    "starts_at",
                    "ends_at",
                    "all_day",
                    "color",
                    "created_at",
                ],
            )
            for event in db.scalars(
                select(Event).where(
                    Event.user_id == current_user.id
                )
            ).all()
        ],
        "projects": [
            row_dict(
                project,
                [
                    "id",
                    "subject_id",
                    "title",
                    "description",
                    "status",
                    "priority",
                    "color",
                    "due_date",
                    "created_at",
                ],
            )
            for project in db.scalars(
                select(Project).where(
                    Project.user_id == current_user.id
                )
            ).all()
        ],
        "categories": [
            row_dict(
                category,
                [
                    "id",
                    "name",
                    "color",
                    "created_at",
                ],
            )
            for category in db.scalars(
                select(Category).where(
                    Category.user_id == current_user.id
                )
            ).all()
        ],
        "subjects": [
            row_dict(
                subject,
                [
                    "id",
                    "name",
                    "color",
                    "professor",
                    "semester",
                    "created_at",
                ],
            )
            for subject in db.scalars(
                select(Subject).where(
                    Subject.user_id == current_user.id
                )
            ).all()
        ],
        "study_sessions": [
            row_dict(
                study,
                [
                    "id",
                    "project_id",
                    "subject_id",
                    "subject",
                    "topic",
                    "study_date",
                    "duration_minutes",
                    "notes",
                    "created_at",
                ],
            )
            for study in db.scalars(
                select(StudySession).where(
                    StudySession.user_id == current_user.id
                )
            ).all()
        ],
        "inbox_items": [
            row_dict(
                item,
                [
                    "id",
                    "subject_id",
                    "text",
                    "note",
                    "optional_date",
                    "optional_time",
                    "status",
                    "processed_at",
                    "converted_type",
                    "converted_id",
                    "created_at",
                    "updated_at",
                ],
            )
            for item in db.scalars(
                select(InboxItem).where(
                    InboxItem.user_id == current_user.id
                )
            ).all()
        ],
        "weekly_reviews": [
            row_dict(
                review,
                [
                    "id",
                    "week_start",
                    "priorities",
                    "reflection",
                    "goal",
                    "updated_at",
                ],
            )
            for review in db.scalars(
                select(WeeklyReview).where(
                    WeeklyReview.user_id == current_user.id
                )
            ).all()
        ],
        "daily_entries": [
            row_dict(
                entry,
                [
                    "id",
                    "entry_date",
                    "mood",
                    "quick_note",
                    "music_data",
                    "reading_data",
                    "watching_data",
                    "photo_media_id",
                    "created_at",
                    "updated_at",
                ],
            )
            for entry in db.scalars(
                select(DailyEntry).where(
                    DailyEntry.user_id == current_user.id
                )
            ).all()
        ],
        "canvas_elements": [
            row_dict(
                element,
                [
                    "id",
                    "page_id",
                    "surface_type",
                    "surface_key",
                    "element_type",
                    "asset_original_name",
                    "asset_mime_type",
                    "asset_size_bytes",
                    "asset_url",
                    "x",
                    "y",
                    "width",
                    "height",
                    "rotation",
                    "z_index",
                    "locked",
                    "data",
                    "created_at",
                ],
            )
            for element in db.scalars(
                select(CanvasElement).where(
                    CanvasElement.user_id == current_user.id
                )
            ).all()
        ],
        "reminders": [
            row_dict(
                reminder,
                [
                    "id",
                    "event_id",
                    "task_id",
                    "habit_id",
                    "minutes_before",
                    "channel",
                    "enabled",
                    "sent_at",
                    "sent_for_signature",
                    "created_at",
                ],
            )
            for reminder in db.scalars(
                select(Reminder).where(
                    Reminder.user_id == current_user.id
                )
            ).all()
        ],
        "habits": [
            row_dict(
                habit,
                [
                    "id",
                    "name",
                    "description",
                    "days_of_week",
                    "time_of_day",
                    "color",
                    "active",
                    "created_at",
                ],
            )
            for habit in db.scalars(
                select(Habit)
                .where(Habit.user_id == current_user.id)
                .order_by(Habit.id)
            ).all()
        ],
        "habit_completions": [
            row_dict(
                completion,
                [
                    "id",
                    "habit_id",
                    "completion_date",
                    "completed_at",
                ],
            )
            for completion in db.scalars(
                select(HabitCompletion)
                .join(Habit)
                .where(Habit.user_id == current_user.id)
                .order_by(HabitCompletion.id)
            ).all()
        ],
        "presets": [
            row_dict(
                preset,
                [
                    "id",
                    "preset_type",
                    "name",
                    "data",
                    "created_at",
                ],
            )
            for preset in db.scalars(
                select(UserPreset).where(
                    UserPreset.user_id == current_user.id
                )
            ).all()
        ],
        "stationery_kits": [
            row_dict(
                kit,
                [
                    "id",
                    "name",
                    "description",
                    "data",
                    "created_at",
                ],
            )
            for kit in db.scalars(
                select(StationeryKit).where(
                    StationeryKit.user_id == current_user.id
                )
            ).all()
        ],
    }


@router.get("/analytics")
def analytics_summary(
    period: Literal[
        "7days",
        "current_month",
        "previous_month",
    ] = Query(default="7days"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    today = date.today()

    if period == "7days":
        start_date = today - timedelta(days=6)
        end_date = today
    elif period == "current_month":
        start_date = today.replace(day=1)
        end_date = today
    else:
        first_day_current_month = today.replace(day=1)
        end_date = first_day_current_month - timedelta(days=1)
        start_date = end_date.replace(day=1)

    start_datetime = datetime.combine(
        start_date,
        datetime.min.time(),
        tzinfo=timezone.utc,
    )
    end_datetime = datetime.combine(
        end_date + timedelta(days=1),
        datetime.min.time(),
        tzinfo=timezone.utc,
    )

    days_in_period = (end_date - start_date).days + 1

    study_minutes = int(
        db.scalar(
            select(
                func.coalesce(
                    func.sum(StudySession.duration_minutes),
                    0,
                )
            ).where(
                StudySession.user_id == current_user.id,
                StudySession.study_date >= start_date,
                StudySession.study_date <= end_date,
            )
        )
        or 0
    )

    study_sessions = _count(
        db,
        StudySession,
        StudySession.user_id == current_user.id,
        StudySession.study_date >= start_date,
        StudySession.study_date <= end_date,
    )

    daily_average_minutes = (
        round(study_minutes / days_in_period, 1)
        if days_in_period
        else 0
    )

    completed_tasks = _count(
        db,
        Task,
        Task.user_id == current_user.id,
        Task.done.is_(True),
        Task.completed_at.is_not(None),
        Task.completed_at >= start_datetime,
        Task.completed_at < end_datetime,
    )

    pending_tasks = _count(
        db,
        Task,
        Task.user_id == current_user.id,
        Task.done.is_(False),
        Task.due_date.is_not(None),
        Task.due_date >= start_date,
        Task.due_date <= end_date,
    )

    overdue_tasks = _count(
        db,
        Task,
        Task.user_id == current_user.id,
        Task.done.is_(False),
        Task.due_date.is_not(None),
        Task.due_date >= start_date,
        Task.due_date <= end_date,
        Task.due_date < today,
    )

    due_tasks_total = _count(
        db,
        Task,
        Task.user_id == current_user.id,
        Task.due_date.is_not(None),
        Task.due_date >= start_date,
        Task.due_date <= end_date,
    )

    due_tasks_done = _count(
        db,
        Task,
        Task.user_id == current_user.id,
        Task.done.is_(True),
        Task.due_date.is_not(None),
        Task.due_date >= start_date,
        Task.due_date <= end_date,
    )

    completion_rate = (
        round((due_tasks_done / due_tasks_total) * 100, 1)
        if due_tasks_total
        else 0
    )

    timeline_map = {
        (start_date + timedelta(days=offset)): {
            "study_minutes": 0,
            "completed_tasks": 0,
        }
        for offset in range(days_in_period)
    }

    timeline_study_rows = db.execute(
        select(
            StudySession.study_date,
            StudySession.duration_minutes,
        ).where(
            StudySession.user_id == current_user.id,
            StudySession.study_date >= start_date,
            StudySession.study_date <= end_date,
        )
    ).all()

    for row in timeline_study_rows:
        item = timeline_map.get(row.study_date)

        if item is not None:
            item["study_minutes"] += int(
                row.duration_minutes or 0
            )

    timeline_task_rows = db.scalars(
        select(Task.completed_at).where(
            Task.user_id == current_user.id,
            Task.done.is_(True),
            Task.completed_at.is_not(None),
            Task.completed_at >= start_datetime,
            Task.completed_at < end_datetime,
        )
    ).all()

    for completed_at in timeline_task_rows:
        if completed_at is None:
            continue

        completed_date = (
            completed_at.astimezone(timezone.utc).date()
            if completed_at.tzinfo is not None
            else completed_at.date()
        )
        item = timeline_map.get(completed_date)

        if item is not None:
            item["completed_tasks"] += 1

    timeline = [
        {
            "date": day.isoformat(),
            "study_minutes": timeline_map[day]["study_minutes"],
            "completed_tasks": timeline_map[day]["completed_tasks"],
        }
        for day in sorted(timeline_map)
    ]

    study_by_subject_rows = db.execute(
        select(
            StudySession.subject_id,
            func.coalesce(
                func.sum(StudySession.duration_minutes),
                0,
            ).label("study_minutes"),
            func.count(StudySession.id).label("study_sessions"),
        )
        .where(
            StudySession.user_id == current_user.id,
            StudySession.subject_id.is_not(None),
            StudySession.study_date >= start_date,
            StudySession.study_date <= end_date,
        )
        .group_by(StudySession.subject_id)
    ).all()

    tasks_by_subject_rows = db.execute(
        select(
            Task.subject_id,
            func.coalesce(
                func.sum(
                    case(
                        (
                            (
                                Task.done.is_(True)
                                & Task.completed_at.is_not(None)
                                & (Task.completed_at >= start_datetime)
                                & (Task.completed_at < end_datetime)
                            ),
                            1,
                        ),
                        else_=0,
                    )
                ),
                0,
            ).label("completed_tasks"),
            func.coalesce(
                func.sum(
                    case(
                        (
                            (
                                Task.done.is_(False)
                                & Task.due_date.is_not(None)
                                & (Task.due_date >= start_date)
                                & (Task.due_date <= end_date)
                            ),
                            1,
                        ),
                        else_=0,
                    )
                ),
                0,
            ).label("pending_tasks"),
        )
        .where(
            Task.user_id == current_user.id,
            Task.subject_id.is_not(None),
        )
        .group_by(Task.subject_id)
    ).all()

    study_by_subject = {
        row.subject_id: {
            "study_minutes": int(row.study_minutes or 0),
            "study_sessions": int(row.study_sessions or 0),
        }
        for row in study_by_subject_rows
    }

    tasks_by_subject = {
        row.subject_id: {
            "completed_tasks": int(row.completed_tasks or 0),
            "pending_tasks": int(row.pending_tasks or 0),
        }
        for row in tasks_by_subject_rows
    }

    subjects = db.scalars(
        select(Subject)
        .where(Subject.user_id == current_user.id)
        .order_by(Subject.name)
    ).all()

    subject_breakdown = []

    for subject in subjects:
        study_data = study_by_subject.get(
            subject.id,
            {
                "study_minutes": 0,
                "study_sessions": 0,
            },
        )
        task_data = tasks_by_subject.get(
            subject.id,
            {
                "completed_tasks": 0,
                "pending_tasks": 0,
            },
        )

        activity_total = (
            study_data["study_minutes"]
            + task_data["completed_tasks"]
            + task_data["pending_tasks"]
        )

        if activity_total == 0:
            continue

        subject_breakdown.append(
            {
                "id": subject.id,
                "name": subject.name,
                "color": subject.color,
                "study_minutes": study_data["study_minutes"],
                "study_sessions": study_data["study_sessions"],
                "completed_tasks": task_data["completed_tasks"],
                "pending_tasks": task_data["pending_tasks"],
            }
        )

    subject_breakdown.sort(
        key=lambda item: (
            item["study_minutes"],
            item["pending_tasks"],
            item["completed_tasks"],
        ),
        reverse=True,
    )

    study_by_project_rows = db.execute(
        select(
            StudySession.project_id,
            func.coalesce(
                func.sum(StudySession.duration_minutes),
                0,
            ).label("study_minutes"),
            func.count(StudySession.id).label("study_sessions"),
        )
        .where(
            StudySession.user_id == current_user.id,
            StudySession.project_id.is_not(None),
            StudySession.study_date >= start_date,
            StudySession.study_date <= end_date,
        )
        .group_by(StudySession.project_id)
    ).all()

    tasks_by_project_rows = db.execute(
        select(
            Task.project_id,
            func.coalesce(
                func.sum(
                    case(
                        (
                            (
                                Task.done.is_(True)
                                & Task.completed_at.is_not(None)
                                & (Task.completed_at >= start_datetime)
                                & (Task.completed_at < end_datetime)
                            ),
                            1,
                        ),
                        else_=0,
                    )
                ),
                0,
            ).label("completed_tasks"),
            func.coalesce(
                func.sum(
                    case(
                        (
                            (
                                Task.done.is_(False)
                                & Task.due_date.is_not(None)
                                & (Task.due_date >= start_date)
                                & (Task.due_date <= end_date)
                            ),
                            1,
                        ),
                        else_=0,
                    )
                ),
                0,
            ).label("pending_tasks"),
        )
        .where(
            Task.user_id == current_user.id,
            Task.project_id.is_not(None),
        )
        .group_by(Task.project_id)
    ).all()

    study_by_project = {
        row.project_id: {
            "study_minutes": int(row.study_minutes or 0),
            "study_sessions": int(row.study_sessions or 0),
        }
        for row in study_by_project_rows
    }

    tasks_by_project = {
        row.project_id: {
            "completed_tasks": int(row.completed_tasks or 0),
            "pending_tasks": int(row.pending_tasks or 0),
        }
        for row in tasks_by_project_rows
    }

    projects = db.scalars(
        select(Project)
        .where(Project.user_id == current_user.id)
        .order_by(Project.title)
    ).all()

    project_breakdown = []

    for project in projects:
        study_data = study_by_project.get(
            project.id,
            {
                "study_minutes": 0,
                "study_sessions": 0,
            },
        )
        task_data = tasks_by_project.get(
            project.id,
            {
                "completed_tasks": 0,
                "pending_tasks": 0,
            },
        )

        activity_total = (
            study_data["study_minutes"]
            + task_data["completed_tasks"]
            + task_data["pending_tasks"]
        )

        if activity_total == 0:
            continue

        project_breakdown.append(
            {
                "id": project.id,
                "title": project.title,
                "color": project.color,
                "status": project.status,
                "study_minutes": study_data["study_minutes"],
                "study_sessions": study_data["study_sessions"],
                "completed_tasks": task_data["completed_tasks"],
                "pending_tasks": task_data["pending_tasks"],
            }
        )

    project_breakdown.sort(
        key=lambda item: (
            item["pending_tasks"],
            item["study_minutes"],
            item["completed_tasks"],
        ),
        reverse=True,
    )

    return {
        "period": period,
        "start_date": start_date.isoformat(),
        "end_date": end_date.isoformat(),
        "studies": {
            "total_minutes": study_minutes,
            "sessions": study_sessions,
            "daily_average_minutes": daily_average_minutes,
        },
        "tasks": {
            "completed": completed_tasks,
            "pending": pending_tasks,
            "overdue": overdue_tasks,
            "completion_rate": completion_rate,
        },
        "timeline": timeline,
        "subjects": subject_breakdown,
        "projects": project_breakdown,
    }
