from datetime import datetime, timezone
from pathlib import Path
from uuid import uuid4

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_session_key, get_current_user
from app.json_utils import deep_merge_json
from app.models import (
    Agenda,
    AuthSession,
    CanvasElement,
    MediaLibraryItem,
    Page,
    PageMedia,
    PageTemplate,
    User,
)
from app.schemas import (
    ChangePasswordRequest,
    DeleteAccountRequest,
    ProfileUpdate,
    SettingsUpdate,
    UserResponse,
)
from app.security import hash_password, verify_password

router = APIRouter(prefix="/profile", tags=["Perfil"])

UPLOAD_ROOT = Path(__file__).resolve().parents[2] / "uploads"
PROFILE_DIRECTORY = UPLOAD_ROOT / "profile"
PAGE_MEDIA_DIRECTORY = UPLOAD_ROOT / "page_media"
CANVAS_MEDIA_DIRECTORY = UPLOAD_ROOT / "canvas_media"
MEDIA_LIBRARY_DIRECTORY = UPLOAD_ROOT / "media_library"
TEMPLATE_MEDIA_DIRECTORY = UPLOAD_ROOT / "template_media"
TEMPLATE_CANVAS_MEDIA_DIRECTORY = UPLOAD_ROOT / "template_canvas_media"
PROFILE_DIRECTORY.mkdir(parents=True, exist_ok=True)

MAX_FILE_SIZE = 10 * 1024 * 1024
MIME_TO_EXTENSION = {
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
    if len(header) >= 12 and header[:4] == b"RIFF" and header[8:12] == b"WEBP":
        return "image/webp"
    return None


def _safe_upload_path(directory: Path, stored_name: str | None) -> Path | None:
    if (
        not isinstance(stored_name, str)
        or not stored_name
        or len(stored_name) > 255
        or stored_name in {".", ".."}
        or any(character in stored_name for character in ("/", "\\", ":", "\x00"))
        or stored_name.rstrip(" .") != stored_name
    ):
        return None
    base = directory.resolve()
    candidate = (directory / stored_name).resolve()
    try:
        candidate.relative_to(base)
    except ValueError:
        return None
    return candidate


def _path_from_upload_url(url: str | None) -> Path | None:
    if not url or not url.startswith("/uploads/"):
        return None
    relative = url.removeprefix("/uploads/")
    candidate = (UPLOAD_ROOT / relative).resolve()
    try:
        candidate.relative_to(UPLOAD_ROOT.resolve())
    except ValueError:
        return None
    return candidate


def _delete_paths(paths: set[Path]) -> None:
    for path in paths:
        try:
            if path.is_file():
                path.unlink()
        except OSError:
            pass


async def _save_image(file: UploadFile) -> str:
    declared_mime = (file.content_type or "").lower()
    if declared_mime not in MIME_TO_EXTENSION:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="Use JPG, PNG, WEBP ou GIF.",
        )

    first_chunk = await file.read(1024 * 1024)
    detected_mime = _detect_image_mime(first_chunk[:32])
    if detected_mime is None or detected_mime != declared_mime:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="O conteúdo do arquivo não corresponde a uma imagem válida.",
        )

    extension = MIME_TO_EXTENSION[detected_mime]
    stored_name = f"{uuid4().hex}{extension}"
    destination = PROFILE_DIRECTORY / stored_name
    total_size = 0

    try:
        with destination.open("wb") as output:
            chunk = first_chunk
            while chunk:
                total_size += len(chunk)
                if total_size > MAX_FILE_SIZE:
                    raise HTTPException(
                        status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                        detail="Arquivo muito grande. Limite de 10 MB.",
                    )
                output.write(chunk)
                chunk = await file.read(1024 * 1024)
    except Exception:
        if destination.exists():
            destination.unlink()
        raise

    return f"/uploads/profile/{stored_name}"


def _collect_user_upload_paths(db: Session, user: User) -> set[Path]:
    paths: set[Path] = set()

    # These User fields are written only by the profile upload routes, not by
    # ProfileUpdate. Their trusted link is limited to the profile category.
    profile_prefix = "/uploads/profile/"
    for url in (user.profile_photo_url, user.profile_cover_url):
        if not url or not url.startswith(profile_prefix):
            continue
        path = _safe_upload_path(PROFILE_DIRECTORY, url.removeprefix(profile_prefix))
        if path:
            paths.add(path)

    # cover_image_url is a user-controlled visual reference, never deletion
    # authority. Owned cover files are collected through their media entities.
    agendas = db.scalars(select(Agenda).where(Agenda.user_id == user.id)).all()
    agenda_ids = [agenda.id for agenda in agendas]
    pages = (
        db.scalars(select(Page).where(Page.agenda_id.in_(agenda_ids))).all()
        if agenda_ids
        else []
    )
    page_ids = [page.id for page in pages]

    if page_ids:
        for media in db.scalars(select(PageMedia).where(PageMedia.page_id.in_(page_ids))).all():
            path = _safe_upload_path(PAGE_MEDIA_DIRECTORY, media.stored_name)
            if path:
                paths.add(path)

    for element in db.scalars(
        select(CanvasElement).where(CanvasElement.user_id == user.id)
    ).all():
        path = _safe_upload_path(CANVAS_MEDIA_DIRECTORY, element.asset_stored_name)
        if path:
            paths.add(path)

    for item in db.scalars(
        select(MediaLibraryItem).where(MediaLibraryItem.user_id == user.id)
    ).all():
        path = _safe_upload_path(MEDIA_LIBRARY_DIRECTORY, item.stored_name)
        if path:
            paths.add(path)

    templates = db.scalars(
        select(PageTemplate).where(PageTemplate.user_id == user.id)
    ).all()
    # Asset names in template snapshots are generated by the server; the
    # template routes accept a source page/name, never client-supplied assets.
    for template in templates:
        data = template.template_data if isinstance(template.template_data, dict) else {}
        for media in data.get("media", []):
            path = _safe_upload_path(
                TEMPLATE_MEDIA_DIRECTORY, media.get("template_stored_name")
            )
            if path:
                paths.add(path)
        for element in data.get("canvas_elements", []):
            path = _safe_upload_path(
                TEMPLATE_CANVAS_MEDIA_DIRECTORY,
                element.get("template_asset_stored_name"),
            )
            if path:
                paths.add(path)

    return paths


@router.get("", response_model=UserResponse)
def get_profile(current_user: User = Depends(get_current_user)):
    return current_user


@router.patch("", response_model=UserResponse)
def update_profile(
    data: ProfileUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    updates = data.model_dump(exclude_unset=True)

    profile_settings = updates.pop("settings", None)

    if "username" in updates and updates["username"] is not None:
        username = updates["username"]
        existing = db.scalar(
            select(User).where(User.username == username, User.id != current_user.id)
        )
        if existing is not None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Este username já está em uso.",
            )

    for field, value in updates.items():
        setattr(current_user, field, value)

    if profile_settings is not None:
        current_user.settings = deep_merge_json(
            current_user.settings or {},
            profile_settings,
        )

    db.commit()
    db.refresh(current_user)
    return current_user


@router.patch("/settings", response_model=UserResponse)
def update_settings(
    data: SettingsUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    current_user.settings = deep_merge_json(current_user.settings or {}, data.settings)
    db.commit()
    db.refresh(current_user)
    return current_user


@router.post("/photo", response_model=UserResponse)
async def upload_profile_photo(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    old_path = _path_from_upload_url(current_user.profile_photo_url)
    new_url = await _save_image(file)
    current_user.profile_photo_url = new_url
    db.commit()
    db.refresh(current_user)
    if old_path:
        _delete_paths({old_path})
    return current_user


@router.delete("/photo", response_model=UserResponse)
def remove_profile_photo(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    old_path = _path_from_upload_url(current_user.profile_photo_url)
    current_user.profile_photo_url = None
    db.commit()
    db.refresh(current_user)
    if old_path:
        _delete_paths({old_path})
    return current_user


@router.post("/cover", response_model=UserResponse)
async def upload_profile_cover(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    old_path = _path_from_upload_url(current_user.profile_cover_url)
    new_url = await _save_image(file)
    current_user.profile_cover_url = new_url
    db.commit()
    db.refresh(current_user)
    if old_path:
        _delete_paths({old_path})
    return current_user


@router.delete("/cover", response_model=UserResponse)
def remove_profile_cover(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    old_path = _path_from_upload_url(current_user.profile_cover_url)
    current_user.profile_cover_url = None
    db.commit()
    db.refresh(current_user)
    if old_path:
        _delete_paths({old_path})
    return current_user


@router.post("/change-password", status_code=status.HTTP_204_NO_CONTENT)
def change_password(
    data: ChangePasswordRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    current_session_key: str | None = Depends(get_current_session_key),
):
    if not verify_password(data.current_password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Senha atual incorreta.",
        )

    current_user.password_hash = hash_password(data.new_password)

    now = datetime.now(timezone.utc)
    sessions = db.scalars(
        select(AuthSession).where(
            AuthSession.user_id == current_user.id,
            AuthSession.revoked_at.is_(None),
        )
    ).all()
    for session in sessions:
        if current_session_key is None or session.session_key != current_session_key:
            session.revoked_at = now

    db.commit()
    return None


@router.delete("/account", status_code=status.HTTP_204_NO_CONTENT)
def delete_account(
    data: DeleteAccountRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not verify_password(data.password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Senha incorreta.",
        )

    files_to_delete = _collect_user_upload_paths(db, current_user)
    user_id = current_user.id

    # SQL DELETE direto deixa o PostgreSQL aplicar todos os ON DELETE CASCADE
    # sem transformar agendas antigas em registros órfãos.
    db.execute(delete(User).where(User.id == user_id))
    db.commit()

    _delete_paths(files_to_delete)
    return None
