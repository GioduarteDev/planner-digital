from datetime import datetime
from pathlib import Path
from shutil import copy2
from uuid import uuid4

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    status,
)
from pydantic import BaseModel, ConfigDict
from sqlalchemy import delete, func, select
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models import (
    Agenda,
    Page,
    PageBlock,
    PageMedia,
    PageTemplate,
    User,
)
from app.schemas import PageResponse


router = APIRouter(
    tags=["Page Templates"],
)


PAGE_MEDIA_DIRECTORY = (
    Path(__file__).resolve().parents[2]
    / "uploads"
    / "page_media"
)

TEMPLATE_MEDIA_DIRECTORY = (
    Path(__file__).resolve().parents[2]
    / "uploads"
    / "template_media"
)

PAGE_MEDIA_DIRECTORY.mkdir(
    parents=True,
    exist_ok=True,
)

TEMPLATE_MEDIA_DIRECTORY.mkdir(
    parents=True,
    exist_ok=True,
)


MAX_PAGES_PER_AGENDA = 400


class PageTemplateCreate(BaseModel):
    name: str


class PageTemplateUpdate(BaseModel):
    name: str


class PageTemplateResponse(BaseModel):
    id: int
    user_id: int
    name: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(
        from_attributes=True
    )


def get_user_page(
    page_id: int,
    current_user: User,
    db: Session,
) -> Page:
    page = db.scalar(
        select(Page)
        .join(
            Agenda,
            Page.agenda_id == Agenda.id,
        )
        .where(
            Page.id == page_id,
            Agenda.user_id == current_user.id,
        )
    )

    if page is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Página não encontrada.",
        )

    return page


def get_user_agenda(
    agenda_id: int,
    current_user: User,
    db: Session,
) -> Agenda:
    agenda = db.scalar(
        select(Agenda)
        .where(
            Agenda.id == agenda_id,
            Agenda.user_id == current_user.id,
        )
    )

    if agenda is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Agenda não encontrada.",
        )

    return agenda


def get_user_template(
    template_id: int,
    current_user: User,
    db: Session,
) -> PageTemplate:
    template = db.scalar(
        select(PageTemplate)
        .where(
            PageTemplate.id == template_id,
            PageTemplate.user_id
            == current_user.id,
        )
    )

    if template is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Template não encontrado.",
        )

    return template


def snapshot_blocks(
    page_id: int,
    db: Session,
) -> list[dict]:
    blocks = db.scalars(
        select(PageBlock)
        .where(
            PageBlock.page_id == page_id,
        )
        .order_by(
            PageBlock.position,
            PageBlock.id,
        )
    ).all()

    return [
        {
            "block_type": block.block_type,
            "data": block.data,
            "position": block.position,
        }
        for block in blocks
    ]


def snapshot_media(
    page_id: int,
    db: Session,
) -> tuple[list[dict], list[Path]]:
    media_items = db.scalars(
        select(PageMedia)
        .where(
            PageMedia.page_id == page_id,
        )
        .order_by(
            PageMedia.z_index,
            PageMedia.id,
        )
    ).all()

    snapshots: list[dict] = []
    created_files: list[Path] = []

    try:
        for media in media_items:
            source = (
                PAGE_MEDIA_DIRECTORY
                / media.stored_name
            )

            if not source.exists():
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=(
                        "Uma mídia da página não foi "
                        "encontrada no disco. Corrija "
                        "a página antes de salvar o template."
                    ),
                )

            extension = source.suffix.lower()
            template_stored_name = (
                f"{uuid4().hex}{extension}"
            )

            destination = (
                TEMPLATE_MEDIA_DIRECTORY
                / template_stored_name
            )

            copy2(
                source,
                destination,
            )

            created_files.append(
                destination
            )

            snapshots.append({
                "media_type":
                    media.media_type,
                "original_name":
                    media.original_name,
                "template_stored_name":
                    template_stored_name,
                "mime_type":
                    media.mime_type,
                "size_bytes":
                    media.size_bytes,
                "x": media.x,
                "y": media.y,
                "width": media.width,
                "height": media.height,
                "rotation": media.rotation,
                "z_index": media.z_index,
                "locked": media.locked,
            })

    except Exception:
        for path in created_files:
            if path.exists():
                path.unlink()

        raise

    return snapshots, created_files


def remove_template_files(
    template: PageTemplate,
) -> None:
    media_data = (
        template.template_data.get(
            "media",
            [],
        )
        if isinstance(
            template.template_data,
            dict,
        )
        else []
    )

    for media in media_data:
        stored_name = media.get(
            "template_stored_name"
        )

        if not stored_name:
            continue

        path = (
            TEMPLATE_MEDIA_DIRECTORY
            / stored_name
        )

        if path.exists():
            path.unlink()


def build_media_for_page(
    page_id: int,
    media_data: list[dict],
) -> tuple[list[PageMedia], list[Path]]:
    rows: list[PageMedia] = []
    created_files: list[Path] = []

    try:
        for media in media_data:
            template_stored_name = (
                media.get(
                    "template_stored_name"
                )
            )

            if not template_stored_name:
                continue

            source = (
                TEMPLATE_MEDIA_DIRECTORY
                / template_stored_name
            )

            if not source.exists():
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=(
                        "Um arquivo deste template "
                        "não foi encontrado."
                    ),
                )

            extension = source.suffix.lower()
            stored_name = (
                f"{uuid4().hex}{extension}"
            )
            destination = (
                PAGE_MEDIA_DIRECTORY
                / stored_name
            )

            copy2(
                source,
                destination,
            )

            created_files.append(
                destination
            )

            rows.append(
                PageMedia(
                    page_id=page_id,
                    media_type=media.get(
                        "media_type",
                        "image",
                    ),
                    original_name=media.get(
                        "original_name",
                        "Mídia do template",
                    ),
                    stored_name=stored_name,
                    mime_type=media.get(
                        "mime_type",
                        "image/png",
                    ),
                    size_bytes=int(
                        media.get(
                            "size_bytes",
                            0,
                        )
                    ),
                    file_url=(
                        "/uploads/page_media/"
                        f"{stored_name}"
                    ),
                    x=int(
                        media.get(
                            "x",
                            40,
                        )
                    ),
                    y=int(
                        media.get(
                            "y",
                            40,
                        )
                    ),
                    width=int(
                        media.get(
                            "width",
                            240,
                        )
                    ),
                    height=int(
                        media.get(
                            "height",
                            180,
                        )
                    ),
                    rotation=int(
                        media.get(
                            "rotation",
                            0,
                        )
                    ),
                    z_index=int(
                        media.get(
                            "z_index",
                            0,
                        )
                    ),
                    locked=bool(
                        media.get(
                            "locked",
                            False,
                        )
                    ),
                )
            )

    except Exception:
        for path in created_files:
            if path.exists():
                path.unlink()

        raise

    return rows, created_files


def build_blocks_for_page(
    page_id: int,
    blocks_data: list[dict],
) -> list[PageBlock]:
    return [
        PageBlock(
            page_id=page_id,
            block_type=block.get(
                "block_type",
                "text",
            ),
            data=block.get(
                "data",
                {},
            ),
            position=int(
                block.get(
                    "position",
                    index,
                )
            ),
        )
        for index, block
        in enumerate(blocks_data)
    ]


@router.get(
    "/templates",
    response_model=list[
        PageTemplateResponse
    ],
)
def list_page_templates(
    db: Session = Depends(get_db),
    current_user: User = Depends(
        get_current_user
    ),
):
    return db.scalars(
        select(PageTemplate)
        .where(
            PageTemplate.user_id
            == current_user.id,
        )
        .order_by(
            PageTemplate.updated_at.desc(),
            PageTemplate.id.desc(),
        )
    ).all()


@router.post(
    "/pages/{page_id}/templates",
    response_model=PageTemplateResponse,
    status_code=status.HTTP_201_CREATED,
)
def save_page_as_template(
    page_id: int,
    payload: PageTemplateCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        get_current_user
    ),
):
    page = get_user_page(
        page_id,
        current_user,
        db,
    )

    name = payload.name.strip()

    if name == "":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Digite um nome para "
                "o template."
            ),
        )

    media_data, created_files = (
        snapshot_media(
            page.id,
            db,
        )
    )

    template = PageTemplate(
        user_id=current_user.id,
        name=name[:150],
        template_data={
            "page_title": page.title,
            "content": page.content,
            "paper_type": page.paper_type,
            "blocks": snapshot_blocks(
                page.id,
                db,
            ),
            "media": media_data,
        },
    )

    try:
        db.add(template)
        db.commit()
        db.refresh(template)

    except Exception:
        db.rollback()

        for path in created_files:
            if path.exists():
                path.unlink()

        raise

    return template


@router.patch(
    "/templates/{template_id}",
    response_model=PageTemplateResponse,
)
def rename_page_template(
    template_id: int,
    payload: PageTemplateUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        get_current_user
    ),
):
    template = get_user_template(
        template_id,
        current_user,
        db,
    )

    name = payload.name.strip()

    if name == "":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "O nome não pode "
                "ficar vazio."
            ),
        )

    template.name = name[:150]

    db.commit()
    db.refresh(template)

    return template


@router.delete(
    "/templates/{template_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_page_template(
    template_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        get_current_user
    ),
):
    template = get_user_template(
        template_id,
        current_user,
        db,
    )

    template_files = []

    if isinstance(
        template.template_data,
        dict,
    ):
        for media in (
            template.template_data.get(
                "media",
                [],
            )
        ):
            stored_name = media.get(
                "template_stored_name"
            )

            if stored_name:
                template_files.append(
                    TEMPLATE_MEDIA_DIRECTORY
                    / stored_name
                )

    db.delete(template)
    db.commit()

    for path in template_files:
        if path.exists():
            path.unlink()

    return None


@router.post(
    "/pages/{page_id}/apply-template/{template_id}",
    response_model=PageResponse,
)
def apply_template_to_page(
    page_id: int,
    template_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        get_current_user
    ),
):
    page = get_user_page(
        page_id,
        current_user,
        db,
    )

    template = get_user_template(
        template_id,
        current_user,
        db,
    )

    data = template.template_data

    if not isinstance(data, dict):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Template inválido.",
        )

    old_media = db.scalars(
        select(PageMedia)
        .where(
            PageMedia.page_id == page.id,
        )
    ).all()

    old_paths = [
        PAGE_MEDIA_DIRECTORY
        / media.stored_name
        for media in old_media
    ]

    new_media_rows: list[PageMedia] = []
    new_media_paths: list[Path] = []

    try:
        new_media_rows, new_media_paths = (
            build_media_for_page(
                page.id,
                data.get(
                    "media",
                    [],
                ),
            )
        )

        db.execute(
            delete(PageBlock)
            .where(
                PageBlock.page_id
                == page.id,
            )
        )

        db.execute(
            delete(PageMedia)
            .where(
                PageMedia.page_id
                == page.id,
            )
        )

        page.content = data.get(
            "content",
            "",
        )
        page.paper_type = data.get(
            "paper_type",
            "blank",
        )

        for block in build_blocks_for_page(
            page.id,
            data.get(
                "blocks",
                [],
            ),
        ):
            db.add(block)

        for media in new_media_rows:
            db.add(media)

        db.commit()
        db.refresh(page)

    except Exception:
        db.rollback()

        for path in new_media_paths:
            if path.exists():
                path.unlink()

        raise

    for path in old_paths:
        if path.exists():
            path.unlink()

    return page


@router.post(
    "/agendas/{agenda_id}/pages/from-template/{template_id}",
    response_model=PageResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_page_from_template(
    agenda_id: int,
    template_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        get_current_user
    ),
):
    get_user_agenda(
        agenda_id,
        current_user,
        db,
    )

    template = get_user_template(
        template_id,
        current_user,
        db,
    )

    page_count = db.scalar(
        select(
            func.count(Page.id)
        )
        .where(
            Page.agenda_id == agenda_id,
        )
    ) or 0

    if page_count >= MAX_PAGES_PER_AGENDA:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "Esta agenda já atingiu "
                "o limite de 400 páginas."
            ),
        )

    max_position = db.scalar(
        select(
            func.max(Page.position)
        )
        .where(
            Page.agenda_id == agenda_id,
        )
    )

    next_position = (
        int(max_position) + 1
        if max_position is not None
        else 0
    )

    data = template.template_data

    if not isinstance(data, dict):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Template inválido.",
        )

    page = Page(
        agenda_id=agenda_id,
        folder_id=None,
        position=next_position,
        title=(
            data.get(
                "page_title",
            )
            or template.name
        )[:200],
        content=data.get(
            "content",
            "",
        ),
        favorite=False,
        paper_type=data.get(
            "paper_type",
            "blank",
        ),
    )

    new_media_paths: list[Path] = []

    try:
        db.add(page)
        db.flush()

        for block in build_blocks_for_page(
            page.id,
            data.get(
                "blocks",
                [],
            ),
        ):
            db.add(block)

        media_rows, new_media_paths = (
            build_media_for_page(
                page.id,
                data.get(
                    "media",
                    [],
                ),
            )
        )

        for media in media_rows:
            db.add(media)

        db.commit()
        db.refresh(page)

    except Exception:
        db.rollback()

        for path in new_media_paths:
            if path.exists():
                path.unlink()

        raise

    return page
