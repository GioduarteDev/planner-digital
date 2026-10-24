from datetime import datetime
from pathlib import Path
from uuid import uuid4

from fastapi import (
    APIRouter,
    Depends,
    File,
    Form,
    HTTPException,
    Query,
    UploadFile,
    status,
)
from pydantic import BaseModel, ConfigDict
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.upload_storage import copy_file, delete_file, file_exists, write_file
from app.dependencies import get_current_user
from app.models import (
    Agenda,
    MediaLibraryItem,
    Page,
    PageMedia,
    User,
)
from app.schemas import PageMediaResponse


router = APIRouter(
    tags=["Media Library"],
)


LIBRARY_DIRECTORY = (
    Path(__file__).resolve().parents[2]
    / "uploads"
    / "media_library"
)

PAGE_MEDIA_DIRECTORY = (
    Path(__file__).resolve().parents[2]
    / "uploads"
    / "page_media"
)

LIBRARY_DIRECTORY.mkdir(
    parents=True,
    exist_ok=True,
)

PAGE_MEDIA_DIRECTORY.mkdir(
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


def _detect_image_mime(header: bytes) -> str | None:
    if len(header) >= 8 and header.startswith(b"\x89PNG\r\n\x1a\n"):
        return "image/png"

    if len(header) >= 3 and header[:3] == b"\xff\xd8\xff":
        return "image/jpeg"

    if len(header) >= 6 and header[:6] in (b"GIF87a", b"GIF89a"):
        return "image/gif"

    if (
        len(header) >= 12
        and header[:4] == b"RIFF"
        and header[8:12] == b"WEBP"
    ):
        return "image/webp"

    return None


class MediaLibraryUpdate(BaseModel):
    name: str | None = None
    kit_name: str | None = None


class MediaLibraryResponse(BaseModel):
    id: int
    user_id: int
    media_type: str
    name: str
    mime_type: str
    size_bytes: int
    file_url: str
    kit_name: str | None
    metadata_json: dict = {}
    created_at: datetime

    model_config = ConfigDict(
        from_attributes=True
    )


def get_user_library_item(
    item_id: int,
    current_user: User,
    db: Session,
) -> MediaLibraryItem:
    item = db.scalar(
        select(MediaLibraryItem)
        .where(
            MediaLibraryItem.id == item_id,
            MediaLibraryItem.user_id
            == current_user.id,
        )
    )

    if item is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=(
                "Item da biblioteca "
                "não encontrado."
            ),
        )

    return item


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


@router.get(
    "/library/media",
    response_model=list[MediaLibraryResponse],
)
def list_library_media(
    media_type: str | None = Query(
        default=None
    ),
    kit_name: str | None = Query(
        default=None
    ),
    db: Session = Depends(get_db),
    current_user: User = Depends(
        get_current_user
    ),
):
    query = (
        select(MediaLibraryItem)
        .where(
            MediaLibraryItem.user_id
            == current_user.id,
        )
    )

    if media_type is not None:
        if media_type not in {
            "image",
            "sticker",
            "stamp",
            "washi",
            "background",
            "frame",
            "icon",
        }:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    "media_type inválido."
                ),
            )

        query = query.where(
            MediaLibraryItem.media_type
            == media_type,
        )

    if kit_name is not None:
        query = query.where(
            MediaLibraryItem.kit_name
            == kit_name,
        )

    return db.scalars(
        query.order_by(
            MediaLibraryItem.created_at.desc(),
            MediaLibraryItem.id.desc(),
        )
    ).all()