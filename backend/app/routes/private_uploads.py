from mimetypes import guess_type
from pathlib import Path

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    status,
)
from fastapi.responses import FileResponse
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models import (
    Agenda,
    CanvasElement,
    MediaLibraryItem,
    Page,
    PageMedia,
    PageTemplate,
    User,
)


router = APIRouter(
    tags=["Private Uploads"],
)


UPLOAD_ROOT = (
    Path(__file__).resolve().parents[2]
    / "uploads"
)


ALLOWED_CATEGORIES = {
    "profile",
    "page_media",
    "media_library",
    "canvas_media",
    "template_media",
    "template_canvas_media",
}


def _not_found():
    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail="Arquivo n?o encontrado.",
    )


def _safe_file_path(
    category: str,
    stored_name: str,
) -> Path:
    if category not in ALLOWED_CATEGORIES:
        _not_found()

    if (
        not stored_name
        or len(stored_name) > 255
        or Path(stored_name).name != stored_name
        or stored_name in {".", ".."}
    ):
        _not_found()

    directory = (
        UPLOAD_ROOT / category
    ).resolve()

    candidate = (
        directory / stored_name
    ).resolve()

    try:
        candidate.relative_to(
            directory
        )
    except ValueError:
        _not_found()

    return candidate


def _template_asset_mime(
    *,
    category: str,
    stored_name: str,
    current_user: User,
    db: Session,
) -> str | None:
    templates = db.scalars(
        select(PageTemplate).where(
            PageTemplate.user_id
            == current_user.id
        )
    ).all()

    for template in templates:
        data = (
            template.template_data
            if isinstance(
                template.template_data,
                dict,
            )
            else {}
        )

        if category == "template_media":
            for media in data.get(
                "media",
                [],
            ):
                if (
                    media.get(
                        "template_stored_name"
                    )
                    == stored_name
                ):
                    value = media.get(
                        "mime_type"
                    )

                    return (
                        str(value)
                        if value
                        else None
                    )

        if (
            category
            == "template_canvas_media"
        ):
            for element in data.get(
                "canvas_elements",
                [],
            ):
                if (
                    element.get(
                        "template_asset_stored_name"
                    )
                    == stored_name
                ):
                    value = element.get(
                        "asset_mime_type"
                    )

                    return (
                        str(value)
                        if value
                        else None
                    )

    return None


def _authorized_mime(
    *,
    category: str,
    stored_name: str,
    current_user: User,
    db: Session,
) -> str | None:
    requested_url = (
        f"/uploads/{category}/"
        f"{stored_name}"
    )

    if category == "profile":
        if requested_url in {
            current_user.profile_photo_url,
            current_user.profile_cover_url,
        }:
            return (
                guess_type(stored_name)[0]
                or "application/octet-stream"
            )

        return None

    if category == "page_media":
        media = db.scalar(
            select(PageMedia)
            .join(
                Page,
                PageMedia.page_id
                == Page.id,
            )
            .join(
                Agenda,
                Page.agenda_id
                == Agenda.id,
            )
            .where(
                PageMedia.stored_name
                == stored_name,
                Agenda.user_id
                == current_user.id,
            )
        )

        return (
            media.mime_type
            if media
            else None
        )

    if category == "media_library":
        item = db.scalar(
            select(MediaLibraryItem)
            .where(
                MediaLibraryItem.stored_name
                == stored_name,
                MediaLibraryItem.user_id
                == current_user.id,
            )
        )

        return (
            item.mime_type
            if item
            else None
        )

    if category == "canvas_media":
        element = db.scalar(
            select(CanvasElement)
            .where(
                CanvasElement.asset_stored_name
                == stored_name,
                CanvasElement.user_id
                == current_user.id,
            )
        )

        return (
            element.asset_mime_type
            if element
            else None
        )

    if category in {
        "template_media",
        "template_canvas_media",
    }:
        return _template_asset_mime(
            category=category,
            stored_name=stored_name,
            current_user=current_user,
            db=db,
        )

    return None


@router.get(
    "/uploads/{category}/{stored_name}",
)
def get_private_upload(
    category: str,
    stored_name: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        get_current_user
    ),
):
    mime_type = _authorized_mime(
        category=category,
        stored_name=stored_name,
        current_user=current_user,
        db=db,
    )

    if mime_type is None:
        # 404 em vez de 403:
        # n?o revela se arquivo de outro
        # usu?rio realmente existe.
        _not_found()

    file_path = _safe_file_path(
        category,
        stored_name,
    )

    if not file_path.is_file():
        _not_found()

    return FileResponse(
        path=file_path,
        media_type=mime_type,
        headers={
            "Cache-Control":
                "private, no-store",
            "X-Content-Type-Options":
                "nosniff",
        },
    )
