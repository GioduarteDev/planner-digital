from datetime import datetime
from pathlib import Path
from shutil import copy2
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


@router.post(
    "/library/media",
    response_model=MediaLibraryResponse,
    status_code=status.HTTP_201_CREATED,
)
async def upload_library_media(
    media_type: str = Form("sticker"),
    name: str | None = Form(None),
    kit_name: str | None = Form(None),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(
        get_current_user
    ),
):
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
        LIBRARY_DIRECTORY
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
                    raise HTTPException(
                        status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                        detail=(
                            "Arquivo muito grande. "
                            "O limite é 10 MB."
                        ),
                    )

                output.write(chunk)

    except Exception:
        if destination.exists():
            destination.unlink()

        raise

    clean_name = (
        name.strip()
        if name
        and name.strip()
        else (
            file.filename
            or "Sem nome"
        )
    )

    clean_kit_name = (
        kit_name.strip()
        if kit_name
        and kit_name.strip()
        else None
    )

    item = MediaLibraryItem(
        user_id=current_user.id,
        media_type=media_type,
        name=clean_name[:255],
        stored_name=stored_name,
        mime_type=file.content_type,
        size_bytes=total_size,
        file_url=(
            f"/uploads/media_library/"
            f"{stored_name}"
        ),
        kit_name=(
            clean_kit_name[:120]
            if clean_kit_name
            else None
        ),
    )

    try:
        db.add(item)
        db.commit()
        db.refresh(item)

    except Exception:
        db.rollback()

        if destination.exists():
            destination.unlink()

        raise

    return item


@router.patch(
    "/library/media/{item_id}",
    response_model=MediaLibraryResponse,
)
def update_library_media(
    item_id: int,
    payload: MediaLibraryUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        get_current_user
    ),
):
    item = get_user_library_item(
        item_id,
        current_user,
        db,
    )

    updates = payload.model_dump(
        exclude_unset=True
    )

    if "name" in updates:
        new_name = updates["name"]

        if (
            new_name is None
            or new_name.strip() == ""
        ):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    "O nome não pode "
                    "ficar vazio."
                ),
            )

        item.name = (
            new_name.strip()[:255]
        )

    if "kit_name" in updates:
        new_kit = updates["kit_name"]

        if (
            new_kit is None
            or new_kit.strip() == ""
        ):
            item.kit_name = None
        else:
            item.kit_name = (
                new_kit.strip()[:120]
            )

    db.commit()
    db.refresh(item)

    return item


@router.delete(
    "/library/media/{item_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_library_media(
    item_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        get_current_user
    ),
):
    item = get_user_library_item(
        item_id,
        current_user,
        db,
    )

    file_path = (
        LIBRARY_DIRECTORY
        / item.stored_name
    )

    db.delete(item)
    db.commit()

    if file_path.exists():
        file_path.unlink()

    return None


@router.post(
    "/pages/{page_id}/media/from-library/{item_id}",
    response_model=PageMediaResponse,
    status_code=status.HTTP_201_CREATED,
)
def insert_library_media_on_page(
    page_id: int,
    item_id: int,
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

    item = get_user_library_item(
        item_id,
        current_user,
        db,
    )

    source_path = (
        LIBRARY_DIRECTORY
        / item.stored_name
    )

    if not source_path.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=(
                "O arquivo da biblioteca "
                "não foi encontrado."
            ),
        )

    extension = source_path.suffix.lower()
    stored_name = (
        f"{uuid4().hex}{extension}"
    )
    destination = (
        PAGE_MEDIA_DIRECTORY
        / stored_name
    )

    highest_z_index = db.scalar(
        select(PageMedia.z_index)
        .where(
            PageMedia.page_id == page_id,
        )
        .order_by(
            PageMedia.z_index.desc()
        )
        .limit(1)
    )

    new_z_index = (
        highest_z_index + 1
        if highest_z_index is not None
        else 0
    )

    copy2(
        source_path,
        destination,
    )

    if item.media_type == "sticker":
        width = 180
        height = 180
    else:
        width = 240
        height = 180

    page_media = PageMedia(
        page_id=page_id,
        media_type=item.media_type,
        original_name=item.name,
        stored_name=stored_name,
        mime_type=item.mime_type,
        size_bytes=item.size_bytes,
        file_url=(
            f"/uploads/page_media/"
            f"{stored_name}"
        ),
        x=40,
        y=40,
        width=width,
        height=height,
        rotation=0,
        z_index=new_z_index,
        locked=False,
    )

    try:
        db.add(page_media)
        db.commit()
        db.refresh(page_media)

    except Exception:
        db.rollback()

        if destination.exists():
            destination.unlink()

        raise

    return page_media
