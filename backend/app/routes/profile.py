from pathlib import Path
from uuid import uuid4

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models import User
from app.schemas import (
    ChangePasswordRequest,
    ProfileUpdate,
    SettingsUpdate,
    UserResponse,
)
from app.security import hash_password, verify_password

router = APIRouter(prefix="/profile", tags=["Perfil"])

UPLOAD_ROOT = Path(__file__).resolve().parents[2] / "uploads" / "profile"
UPLOAD_ROOT.mkdir(parents=True, exist_ok=True)

ALLOWED_MIME_TYPES = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/gif": ".gif",
}
MAX_FILE_SIZE = 10 * 1024 * 1024


def _delete_local_profile_file(url: str | None) -> None:
    if not url or not url.startswith("/uploads/profile/"):
        return
    name = url.rsplit("/", 1)[-1]
    path = UPLOAD_ROOT / name
    if path.exists() and path.is_file():
        path.unlink()


async def _save_image(file: UploadFile) -> str:
    if file.content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="Use JPG, PNG, WEBP ou GIF.",
        )

    extension = ALLOWED_MIME_TYPES[file.content_type]
    stored_name = f"{uuid4().hex}{extension}"
    destination = UPLOAD_ROOT / stored_name
    total_size = 0

    try:
        with destination.open("wb") as output:
            while True:
                chunk = await file.read(1024 * 1024)
                if not chunk:
                    break
                total_size += len(chunk)
                if total_size > MAX_FILE_SIZE:
                    raise HTTPException(
                        status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                        detail="Arquivo muito grande. Limite de 10 MB.",
                    )
                output.write(chunk)
    except Exception:
        if destination.exists():
            destination.unlink()
        raise

    return f"/uploads/profile/{stored_name}"


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

    if "username" in updates and updates["username"] is not None:
        username = updates["username"]
        existing = db.scalar(
            select(User).where(
                User.username == username,
                User.id != current_user.id,
            )
        )
        if existing is not None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Este username já está em uso.",
            )

    for field, value in updates.items():
        setattr(current_user, field, value)

    db.commit()
    db.refresh(current_user)
    return current_user


@router.patch("/settings", response_model=UserResponse)
def update_settings(
    data: SettingsUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    current = dict(current_user.settings or {})
    current.update(data.settings)
    current_user.settings = current
    db.commit()
    db.refresh(current_user)
    return current_user


@router.post("/photo", response_model=UserResponse)
async def upload_profile_photo(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    old_url = current_user.profile_photo_url
    new_url = await _save_image(file)
    current_user.profile_photo_url = new_url
    db.commit()
    db.refresh(current_user)
    _delete_local_profile_file(old_url)
    return current_user


@router.delete("/photo", response_model=UserResponse)
def remove_profile_photo(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    old_url = current_user.profile_photo_url
    current_user.profile_photo_url = None
    db.commit()
    db.refresh(current_user)
    _delete_local_profile_file(old_url)
    return current_user


@router.post("/cover", response_model=UserResponse)
async def upload_profile_cover(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    old_url = current_user.profile_cover_url
    new_url = await _save_image(file)
    current_user.profile_cover_url = new_url
    db.commit()
    db.refresh(current_user)
    _delete_local_profile_file(old_url)
    return current_user


@router.delete("/cover", response_model=UserResponse)
def remove_profile_cover(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    old_url = current_user.profile_cover_url
    current_user.profile_cover_url = None
    db.commit()
    db.refresh(current_user)
    _delete_local_profile_file(old_url)
    return current_user


@router.post("/change-password", status_code=status.HTTP_204_NO_CONTENT)
def change_password(
    data: ChangePasswordRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not verify_password(data.current_password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Senha atual incorreta.",
        )
    current_user.password_hash = hash_password(data.new_password)
    db.commit()
    return None
