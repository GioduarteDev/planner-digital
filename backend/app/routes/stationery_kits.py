from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models import StationeryKit, User
from app.schemas import StationeryKitCreate, StationeryKitResponse, StationeryKitUpdate

router = APIRouter(prefix="/stationery-kits", tags=["Kits de papelaria"])


def get_user_kit(kit_id: int, user_id: int, db: Session) -> StationeryKit | None:
    return db.scalar(
        select(StationeryKit).where(
            StationeryKit.id == kit_id,
            StationeryKit.user_id == user_id,
        )
    )


@router.get("", response_model=list[StationeryKitResponse])
def list_kits(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return db.scalars(
        select(StationeryKit)
        .where(StationeryKit.user_id == current_user.id)
        .order_by(StationeryKit.updated_at.desc(), StationeryKit.id.desc())
    ).all()


@router.post("", response_model=StationeryKitResponse, status_code=status.HTTP_201_CREATED)
def create_kit(
    data: StationeryKitCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    kit = StationeryKit(user_id=current_user.id, **data.model_dump())
    db.add(kit)
    db.commit()
    db.refresh(kit)
    return kit


@router.patch("/{kit_id}", response_model=StationeryKitResponse)
def update_kit(
    kit_id: int,
    data: StationeryKitUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    kit = get_user_kit(kit_id, current_user.id, db)
    if kit is None:
        raise HTTPException(status_code=404, detail="Kit não encontrado.")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(kit, field, value)
    db.commit()
    db.refresh(kit)
    return kit


@router.delete("/{kit_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_kit(
    kit_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    kit = get_user_kit(kit_id, current_user.id, db)
    if kit is None:
        raise HTTPException(status_code=404, detail="Kit não encontrado.")
    db.delete(kit)
    db.commit()
    return None
