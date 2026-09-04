from pathlib import Path
from uuid import uuid4

from fastapi import (
    APIRouter,
    Depends,
    File,
    Form,
    HTTPException,
    UploadFile,
    status,
)
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models import (
    Agenda,
    Page,
    PageMedia,
    User,
)
from app.schemas import PageMediaResponse


router = APIRouter(
    tags=["Page Media"],
)


UPLOAD_DIRECTORY = (
    Path(__file__).resolve().parents[2]
    / "uploads"
    / "page_media"
)

UPLOAD_DIRECTORY.mkdir(
    parents=True,
    exist_ok=True,
)


MAX_FILE_SIZE = 10 * 1024 * 1024


ALLOWED_MIME_TYPES = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/gif": ".gif",
}


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


def get_user_media(
    media_id: int,
    current_user: User,
    db: Session,
) -> PageMedia:
    media = db.scalar(
        select(PageMedia)
        .join(
            Page,
            PageMedia.page_id == Page.id,
        )
        .join(
            Agenda,
            Page.agenda_id == Agenda.id,
        )
        .where(
            PageMedia.id == media_id,
            Agenda.user_id == current_user.id,
        )
    )

    if media is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Mídia não encontrada.",
        )

    return media


@router.get(
    "/pages/{page_id}/media",
    response_model=list[PageMediaResponse],
)
def list_page_media(
    page_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        get_current_user
    ),
):
    get_user_page(
        page_id,
        current_user,
        db,
    )

    media_items = db.scalars(
        select(PageMedia)
        .where(
            PageMedia.page_id == page_id,
        )
        .order_by(
            PageMedia.created_at,
            PageMedia.id,
        )
    ).all()

    return media_items


@router.post(
    "/pages/{page_id}/media",
    response_model=PageMediaResponse,
    status_code=status.HTTP_201_CREATED,
)
async def upload_page_media(
    page_id: int,
    media_type: str = Form("image"),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(
        get_current_user
    ),
):
    get_user_page(
        page_id,
        current_user,
        db,
    )

    if media_type not in {
        "image",
        "sticker",
    }:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "media_type deve ser "
                "'image' ou 'sticker'."
            ),
        )

    if file.content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail=(
                "Formato não permitido. "
                "Use JPG, PNG, WEBP ou GIF."
            ),
        )

    extension = ALLOWED_MIME_TYPES[
        file.content_type
    ]

    stored_name = (
        f"{uuid4().hex}{extension}"
    )

    destination = (
        UPLOAD_DIRECTORY
        / stored_name
    )

    total_size = 0

    try:
        with destination.open("wb") as output:
            while True:
                chunk = await file.read(
                    1024 * 1024
                )

                if not chunk:
                    break

                total_size += len(chunk)

                if total_size > MAX_FILE_SIZE:
                    output.close()

                    if destination.exists():
                        destination.unlink()

                    raise HTTPException(
                        status_code=(
                            status.HTTP_413_CONTENT_TOO_LARGE
                        ),
                        detail=(
                            "Arquivo maior que 10 MB."
                        ),
                    )

                output.write(chunk)

    finally:
        await file.close()

    original_name = (
        file.filename
        or "imagem"
    )[:255]

    file_url = (
        f"/uploads/page_media/"
        f"{stored_name}"
    )

    media = PageMedia(
        page_id=page_id,
        media_type=media_type,
        original_name=original_name,
        stored_name=stored_name,
        mime_type=file.content_type,
        size_bytes=total_size,
        file_url=file_url,
    )

    try:
        db.add(media)
        db.commit()
        db.refresh(media)

    except Exception:
        db.rollback()

        if destination.exists():
            destination.unlink()

        raise

    return media


@router.delete(
    "/media/{media_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_page_media(
    media_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        get_current_user
    ),
):
    media = get_user_media(
        media_id,
        current_user,
        db,
    )

    file_path = (
        UPLOAD_DIRECTORY
        / media.stored_name
    )

    db.delete(media)
    db.commit()

    if file_path.exists():
        file_path.unlink()