from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models import User, UserPreset
from app.schemas import UserPresetCreate, UserPresetResponse, UserPresetUpdate

router = APIRouter(prefix="/presets", tags=["Presets"])


def get_user_preset(preset_id: int, user_id: int, db: Session) -> UserPreset | None:
    return db.scalar(
        select(UserPreset).where(UserPreset.id == preset_id, UserPreset.user_id == user_id)
    )


@router.get("", response_model=list[UserPresetResponse])
def list_presets(
    preset_type: str | None = Query(default=None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = select(UserPreset).where(UserPreset.user_id == current_user.id)
    if preset_type:
        query = query.where(UserPreset.preset_type == preset_type)
    return db.scalars(query.order_by(UserPreset.updated_at.desc(), UserPreset.id.desc())).all()


@router.post("", response_model=UserPresetResponse, status_code=status.HTTP_201_CREATED)
def create_preset(
    data: UserPresetCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    preset = UserPreset(user_id=current_user.id, **data.model_dump())
    db.add(preset)
    db.commit()
    db.refresh(preset)
    return preset


@router.patch("/{preset_id}", response_model=UserPresetResponse)
def update_preset(
    preset_id: int,
    data: UserPresetUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    preset = get_user_preset(preset_id, current_user.id, db)
    if preset is None:
        raise HTTPException(status_code=404, detail="Preset não encontrado.")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(preset, field, value)
    db.commit()
    db.refresh(preset)
    return preset


@router.delete("/{preset_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_preset(
    preset_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    preset = get_user_preset(preset_id, current_user.id, db)
    if preset is None:
        raise HTTPException(status_code=404, detail="Preset não encontrado.")
    db.delete(preset)
    db.commit()
    return None
