from pathlib import Path
from shutil import copy2
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models import (
    Agenda,
    CanvasElement,
    Folder,
    Page,
    PageBlock,
    PageMedia,
    Reminder,
    Task,
    User,
)
from app.routes.helpers import get_user_agenda_or_404, get_user_page_or_404
from app.schemas import AgendaResponse, PageResponse

router = APIRouter(tags=["Duplicação"])

MAX_AGENDAS = 6
MAX_PAGES = 400
PAGE_MEDIA_DIRECTORY = Path(__file__).resolve().parents[2] / "uploads" / "page_media"
CANVAS_MEDIA_DIRECTORY = Path(__file__).resolve().parents[2] / "uploads" / "canvas_media"
PAGE_MEDIA_DIRECTORY.mkdir(parents=True, exist_ok=True)
CANVAS_MEDIA_DIRECTORY.mkdir(parents=True, exist_ok=True)


def _copy_media_row(source: PageMedia, new_page_id: int) -> tuple[PageMedia, Path]:
    source_path = PAGE_MEDIA_DIRECTORY / source.stored_name
    if not source_path.exists():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"A mídia '{source.original_name}' não foi encontrada no disco.",
        )

    stored_name = f"{uuid4().hex}{source_path.suffix.lower()}"
    destination = PAGE_MEDIA_DIRECTORY / stored_name
    copy2(source_path, destination)

    row = PageMedia(
        page_id=new_page_id,
        media_type=source.media_type,
        original_name=source.original_name,
        stored_name=stored_name,
        mime_type=source.mime_type,
        size_bytes=source.size_bytes,
        file_url=f"/uploads/page_media/{stored_name}",
        x=source.x,
        y=source.y,
        width=source.width,
        height=source.height,
        rotation=source.rotation,
        z_index=source.z_index,
        locked=source.locked,
    )
    return row, destination


def _copy_page_children(
    *,
    source_page: Page,
    new_page: Page,
    current_user: User,
    db: Session,
    created_files: list[Path],
) -> None:
    blocks = db.scalars(
        select(PageBlock)
        .where(PageBlock.page_id == source_page.id)
        .order_by(PageBlock.position, PageBlock.id)
    ).all()
    for block in blocks:
        db.add(
            PageBlock(
                page_id=new_page.id,
                block_type=block.block_type,
                data=dict(block.data or {}),
                position=block.position,
            )
        )

    elements = db.scalars(
        select(CanvasElement)
        .where(
            CanvasElement.user_id == current_user.id,
            CanvasElement.page_id == source_page.id,
            CanvasElement.surface_type == "page",
        )
        .order_by(CanvasElement.z_index, CanvasElement.id)
    ).all()
    for element in elements:
        asset_stored_name = None
        asset_url = None
        if element.asset_stored_name:
            source_asset = CANVAS_MEDIA_DIRECTORY / element.asset_stored_name
            if not source_asset.exists():
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="Um arquivo de elemento do canvas não foi encontrado.",
                )
            asset_stored_name = f"{uuid4().hex}{source_asset.suffix.lower()}"
            destination_asset = CANVAS_MEDIA_DIRECTORY / asset_stored_name
            copy2(source_asset, destination_asset)
            created_files.append(destination_asset)
            asset_url = f"/uploads/canvas_media/{asset_stored_name}"

        db.add(
            CanvasElement(
                user_id=current_user.id,
                page_id=new_page.id,
                surface_type="page",
                surface_key="",
                element_type=element.element_type,
                asset_stored_name=asset_stored_name,
                asset_original_name=element.asset_original_name,
                asset_mime_type=element.asset_mime_type,
                asset_size_bytes=element.asset_size_bytes,
                asset_url=asset_url,
                x=element.x,
                y=element.y,
                width=element.width,
                height=element.height,
                rotation=element.rotation,
                z_index=element.z_index,
                locked=element.locked,
                data=dict(element.data or {}),
            )
        )

    media_items = db.scalars(
        select(PageMedia)
        .where(PageMedia.page_id == source_page.id)
        .order_by(PageMedia.z_index, PageMedia.id)
    ).all()
    for source_media in media_items:
        new_media, created_path = _copy_media_row(source_media, new_page.id)
        created_files.append(created_path)
        db.add(new_media)

    tasks = db.scalars(
        select(Task)
        .where(
            Task.user_id == current_user.id,
            Task.page_id == source_page.id,
        )
        .order_by(Task.id)
    ).all()
    for task in tasks:
        new_task = Task(
            user_id=current_user.id,
            page_id=new_page.id,
            project_id=task.project_id,
            category_id=task.category_id,
            text=task.text,
            description=task.description,
            done=task.done,
            due_date=task.due_date,
            due_at=task.due_at,
            priority=task.priority,
            show_in_calendar=task.show_in_calendar,
        )
        db.add(new_task)
        db.flush()

        reminders = db.scalars(
            select(Reminder).where(
                Reminder.user_id == current_user.id,
                Reminder.task_id == task.id,
            )
        ).all()
        for reminder in reminders:
            db.add(
                Reminder(
                    user_id=current_user.id,
                    task_id=new_task.id,
                    event_id=None,
                    minutes_before=reminder.minutes_before,
                    channel=reminder.channel,
                    enabled=reminder.enabled,
                )
            )


@router.post(
    "/pages/{page_id}/duplicate",
    response_model=PageResponse,
    status_code=status.HTTP_201_CREATED,
)
def duplicate_page(
    page_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    source = get_user_page_or_404(page_id, current_user, db)

    page_count = db.scalar(
        select(func.count(Page.id)).where(Page.agenda_id == source.agenda_id)
    ) or 0
    if page_count >= MAX_PAGES:
        raise HTTPException(status_code=409, detail="Esta agenda já atingiu 400 páginas.")

    max_position = db.scalar(
        select(func.max(Page.position)).where(
            Page.agenda_id == source.agenda_id,
            Page.folder_id == source.folder_id,
        )
    )

    new_page = Page(
        agenda_id=source.agenda_id,
        folder_id=source.folder_id,
        position=(int(max_position) + 1 if max_position is not None else 0),
        title=f"{source.title} (cópia)"[:200],
        content=source.content,
        favorite=False,
        paper_type=source.paper_type,
        paper_settings=dict(source.paper_settings or {}),
    )

    created_files: list[Path] = []
    try:
        db.add(new_page)
        db.flush()
        _copy_page_children(
            source_page=source,
            new_page=new_page,
            current_user=current_user,
            db=db,
            created_files=created_files,
        )
        db.commit()
        db.refresh(new_page)
    except Exception:
        db.rollback()
        for path in created_files:
            if path.exists():
                path.unlink()
        raise

    return new_page


@router.post(
    "/agendas/{agenda_id}/duplicate",
    response_model=AgendaResponse,
    status_code=status.HTTP_201_CREATED,
)
def duplicate_agenda(
    agenda_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    source = get_user_agenda_or_404(agenda_id, current_user, db)

    agenda_count = db.scalar(
        select(func.count(Agenda.id)).where(Agenda.user_id == current_user.id)
    ) or 0
    if agenda_count >= MAX_AGENDAS:
        raise HTTPException(
            status_code=409,
            detail="Você já atingiu o limite de 6 agendas.",
        )

    new_agenda = Agenda(
        user_id=current_user.id,
        title=f"{source.title} (cópia)"[:120],
        cover_color=source.cover_color,
        cover_image_url=source.cover_image_url,
        settings=dict(source.settings or {}),
    )

    created_files: list[Path] = []
    try:
        db.add(new_agenda)
        db.flush()

        folder_map: dict[int, int] = {}
        source_folders = db.scalars(
            select(Folder)
            .where(Folder.agenda_id == source.id)
            .order_by(Folder.position, Folder.id)
        ).all()
        for folder in source_folders:
            new_folder = Folder(
                agenda_id=new_agenda.id,
                title=folder.title,
                position=folder.position,
            )
            db.add(new_folder)
            db.flush()
            folder_map[folder.id] = new_folder.id

        source_pages = db.scalars(
            select(Page)
            .where(Page.agenda_id == source.id)
            .order_by(Page.position, Page.id)
        ).all()
        for source_page in source_pages:
            new_page = Page(
                agenda_id=new_agenda.id,
                folder_id=(folder_map.get(source_page.folder_id) if source_page.folder_id else None),
                position=source_page.position,
                title=source_page.title,
                content=source_page.content,
                favorite=source_page.favorite,
                paper_type=source_page.paper_type,
                paper_settings=dict(source_page.paper_settings or {}),
            )
            db.add(new_page)
            db.flush()
            _copy_page_children(
                source_page=source_page,
                new_page=new_page,
                current_user=current_user,
                db=db,
                created_files=created_files,
            )

        db.commit()
        db.refresh(new_agenda)
    except Exception:
        db.rollback()
        for path in created_files:
            if path.exists():
                path.unlink()
        raise

    return new_agenda
