from pathlib import Path
from shutil import copy2
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models import CanvasElement, MediaLibraryItem, User
from app.routes.helpers import get_user_page_or_404
from app.schemas import CanvasElementCreate, CanvasElementResponse, CanvasElementUpdate

router = APIRouter(prefix="/canvas", tags=["Canvas"])

LIBRARY_DIRECTORY = Path(__file__).resolve().parents[2] / "uploads" / "media_library"
CANVAS_MEDIA_DIRECTORY = Path(__file__).resolve().parents[2] / "uploads" / "canvas_media"
CANVAS_MEDIA_DIRECTORY.mkdir(parents=True, exist_ok=True)


def get_user_element_or_404(
    element_id: int,
    current_user: User,
    db: Session,
) -> CanvasElement:
    element = db.scalar(
        select(CanvasElement).where(
            CanvasElement.id == element_id,
            CanvasElement.user_id == current_user.id,
        )
    )
    if element is None:
        raise HTTPException(status_code=404, detail="Elemento não encontrado.")
    return element


def get_user_library_item_or_404(
    item_id: int,
    current_user: User,
    db: Session,
) -> MediaLibraryItem:
    item = db.scalar(
        select(MediaLibraryItem).where(
            MediaLibraryItem.id == item_id,
            MediaLibraryItem.user_id == current_user.id,
        )
    )
    if item is None:
        raise HTTPException(status_code=404, detail="Item da biblioteca não encontrado.")
    return item


def normalize_surface(
    data: CanvasElementCreate,
    current_user: User,
    db: Session,
) -> tuple[int | None, str]:
    if data.surface_type == "page":
        if data.page_id is None:
            raise HTTPException(status_code=400, detail="page_id é obrigatório para elementos de página.")
        get_user_page_or_404(data.page_id, current_user, db)
        return data.page_id, ""

    if data.page_id is not None:
        raise HTTPException(status_code=400, detail="page_id só pode ser usado em surface_type='page'.")

    if data.surface_type == "profile":
        return None, "profile"

    key = data.surface_key.strip()
    if key == "":
        raise HTTPException(status_code=400, detail="surface_key é obrigatório para o calendário.")
    return None, key


def same_surface_query(
    *,
    user_id: int,
    surface_type: str,
    surface_key: str,
    page_id: int | None,
):
    query = select(func.max(CanvasElement.z_index)).where(
        CanvasElement.user_id == user_id,
        CanvasElement.surface_type == surface_type,
        CanvasElement.surface_key == surface_key,
    )
    if page_id is None:
        query = query.where(CanvasElement.page_id.is_(None))
    else:
        query = query.where(CanvasElement.page_id == page_id)
    return query


def copy_canvas_asset(source_path: Path) -> tuple[str, Path]:
    if not source_path.exists():
        raise HTTPException(status_code=409, detail="Arquivo do elemento não foi encontrado.")
    stored_name = f"{uuid4().hex}{source_path.suffix.lower()}"
    destination = CANVAS_MEDIA_DIRECTORY / stored_name
    copy2(source_path, destination)
    return stored_name, destination


def delete_canvas_asset(element: CanvasElement) -> None:
    if not element.asset_stored_name:
        return
    path = CANVAS_MEDIA_DIRECTORY / element.asset_stored_name
    if path.exists():
        path.unlink()


@router.get("/elements", response_model=list[CanvasElementResponse])
def list_elements(
    surface_type: str = Query(...),
    surface_key: str = Query(default=""),
    page_id: int | None = Query(default=None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if surface_type not in {"page", "calendar", "profile"}:
        raise HTTPException(status_code=400, detail="surface_type inválido.")

    query = select(CanvasElement).where(
        CanvasElement.user_id == current_user.id,
        CanvasElement.surface_type == surface_type,
    )

    if surface_type == "page":
        if page_id is None:
            raise HTTPException(status_code=400, detail="Informe page_id.")
        get_user_page_or_404(page_id, current_user, db)
        query = query.where(CanvasElement.page_id == page_id)
    elif surface_type == "profile":
        query = query.where(
            CanvasElement.page_id.is_(None),
            CanvasElement.surface_key == "profile",
        )
    else:
        key = surface_key.strip()
        if key == "":
            raise HTTPException(status_code=400, detail="Informe surface_key.")
        query = query.where(
            CanvasElement.page_id.is_(None),
            CanvasElement.surface_key == key,
        )

    return db.scalars(query.order_by(CanvasElement.z_index, CanvasElement.id)).all()


@router.post("/elements", response_model=CanvasElementResponse, status_code=status.HTTP_201_CREATED)
def create_element(
    data: CanvasElementCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    page_id, surface_key = normalize_surface(data, current_user, db)
    highest_z = db.scalar(
        same_surface_query(
            user_id=current_user.id,
            surface_type=data.surface_type,
            surface_key=surface_key,
            page_id=page_id,
        )
    )

    element = CanvasElement(
        user_id=current_user.id,
        page_id=page_id,
        surface_type=data.surface_type,
        surface_key=surface_key,
        element_type=data.element_type,
        x=data.x,
        y=data.y,
        width=data.width,
        height=data.height,
        rotation=data.rotation,
        z_index=(highest_z + 1 if highest_z is not None else data.z_index),
        locked=data.locked,
        data=data.data,
    )
    db.add(element)
    db.commit()
    db.refresh(element)
    return element


@router.post(
    "/elements/from-library/{item_id}",
    response_model=CanvasElementResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_element_from_library(
    item_id: int,
    data: CanvasElementCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    page_id, surface_key = normalize_surface(data, current_user, db)
    item = get_user_library_item_or_404(item_id, current_user, db)
    source = LIBRARY_DIRECTORY / item.stored_name
    stored_name, destination = copy_canvas_asset(source)

    highest_z = db.scalar(
        same_surface_query(
            user_id=current_user.id,
            surface_type=data.surface_type,
            surface_key=surface_key,
            page_id=page_id,
        )
    )

    element = CanvasElement(
        user_id=current_user.id,
        page_id=page_id,
        surface_type=data.surface_type,
        surface_key=surface_key,
        element_type=data.element_type or item.media_type,
        asset_stored_name=stored_name,
        asset_original_name=item.name,
        asset_mime_type=item.mime_type,
        asset_size_bytes=item.size_bytes,
        asset_url=f"/uploads/canvas_media/{stored_name}",
        x=data.x,
        y=data.y,
        width=data.width,
        height=data.height,
        rotation=data.rotation,
        z_index=(highest_z + 1 if highest_z is not None else data.z_index),
        locked=data.locked,
        data={**data.data, "source_library_item_id": item.id},
    )

    try:
        db.add(element)
        db.commit()
        db.refresh(element)
    except Exception:
        db.rollback()
        if destination.exists():
            destination.unlink()
        raise

    return element


@router.patch("/elements/{element_id}", response_model=CanvasElementResponse)
def update_element(
    element_id: int,
    data: CanvasElementUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    element = get_user_element_or_404(element_id, current_user, db)
    updates = data.model_dump(exclude_unset=True)
    if element.surface_type == "profile" and "surface_key" in updates:
        updates["surface_key"] = "profile"
    for field, value in updates.items():
        setattr(element, field, value)
    db.commit()
    db.refresh(element)
    return element


@router.post(
    "/elements/{element_id}/duplicate",
    response_model=CanvasElementResponse,
    status_code=status.HTTP_201_CREATED,
)
def duplicate_element(
    element_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    source = get_user_element_or_404(element_id, current_user, db)
    highest_z = db.scalar(
        same_surface_query(
            user_id=current_user.id,
            surface_type=source.surface_type,
            surface_key=source.surface_key,
            page_id=source.page_id,
        )
    )

    stored_name = None
    destination = None
    if source.asset_stored_name:
        source_path = CANVAS_MEDIA_DIRECTORY / source.asset_stored_name
        stored_name, destination = copy_canvas_asset(source_path)

    copy = CanvasElement(
        user_id=current_user.id,
        page_id=source.page_id,
        surface_type=source.surface_type,
        surface_key=source.surface_key,
        element_type=source.element_type,
        asset_stored_name=stored_name,
        asset_original_name=source.asset_original_name,
        asset_mime_type=source.asset_mime_type,
        asset_size_bytes=source.asset_size_bytes,
        asset_url=(f"/uploads/canvas_media/{stored_name}" if stored_name else None),
        x=source.x + 24,
        y=source.y + 24,
        width=source.width,
        height=source.height,
        rotation=source.rotation,
        z_index=(highest_z + 1 if highest_z is not None else source.z_index + 1),
        locked=False,
        data=dict(source.data or {}),
    )

    try:
        db.add(copy)
        db.commit()
        db.refresh(copy)
    except Exception:
        db.rollback()
        if destination is not None and destination.exists():
            destination.unlink()
        raise

    return copy


@router.delete("/elements/{element_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_element(
    element_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    element = get_user_element_or_404(element_id, current_user, db)
    stored_name = element.asset_stored_name
    db.delete(element)
    db.commit()
    if stored_name:
        path = CANVAS_MEDIA_DIRECTORY / stored_name
        if path.exists():
            path.unlink()
    return None
