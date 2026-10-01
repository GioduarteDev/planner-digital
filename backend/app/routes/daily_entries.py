from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models import DailyEntry, MediaLibraryItem, User
from app.schemas import DailyEntryResponse, DailyEntryUpdate, DailyEntryUpsert


router = APIRouter(prefix="/daily-entries", tags=["Daily entries"])


def get_user_entry(entry_date: date, current_user: User, db: Session) -> DailyEntry | None:
    return db.scalar(
        select(DailyEntry).where(
            DailyEntry.user_id == current_user.id,
            DailyEntry.entry_date == entry_date,
        )
    )


def validate_photo(photo_media_id: int | None, current_user: User, db: Session) -> None:
    if photo_media_id is None:
        return
    media = db.scalar(
        select(MediaLibraryItem).where(
            MediaLibraryItem.id == photo_media_id,
            MediaLibraryItem.user_id == current_user.id,
        )
    )
    if media is None:
        raise HTTPException(status_code=404, detail="Foto da biblioteca não encontrada.")
    if media.media_type != "image":
        raise HTTPException(status_code=400, detail="O momento diário aceita apenas uma foto.")


@router.get("", response_model=list[DailyEntryResponse])
def list_daily_entries(
    start: date | None = Query(default=None),
    end: date | None = Query(default=None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if start is not None and end is not None and end < start:
        raise HTTPException(status_code=400, detail="O fim não pode ser anterior ao início.")
    query = select(DailyEntry).where(DailyEntry.user_id == current_user.id)
    if start is not None:
        query = query.where(DailyEntry.entry_date >= start)
    if end is not None:
        query = query.where(DailyEntry.entry_date <= end)
    return db.scalars(query.order_by(DailyEntry.entry_date.desc())).all()


@router.get("/{entry_date}", response_model=DailyEntryResponse)
def get_daily_entry(
    entry_date: date,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    entry = get_user_entry(entry_date, current_user, db)
    if entry is None:
        raise HTTPException(status_code=404, detail="Registro diário não encontrado.")
    return entry


@router.put("/{entry_date}", response_model=DailyEntryResponse)
def upsert_daily_entry(
    entry_date: date,
    data: DailyEntryUpsert,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    validate_photo(data.photo_media_id, current_user, db)
    entry = get_user_entry(entry_date, current_user, db)
    creating = entry is None
    if entry is None:
        entry = DailyEntry(user_id=current_user.id, entry_date=entry_date)
        db.add(entry)
    updates = data.model_dump(exclude_unset=True)
    for field, value in updates.items():
        setattr(entry, field, value)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        if not creating:
            raise
        entry = get_user_entry(entry_date, current_user, db)
        if entry is None:
            raise
        for field, value in updates.items():
            setattr(entry, field, value)
        db.commit()
    db.refresh(entry)
    return entry


@router.patch("/{entry_date}", response_model=DailyEntryResponse)
def update_daily_entry(
    entry_date: date,
    data: DailyEntryUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    entry = get_user_entry(entry_date, current_user, db)
    if entry is None:
        raise HTTPException(status_code=404, detail="Registro diário não encontrado.")
    updates = data.model_dump(exclude_unset=True)
    if "photo_media_id" in updates:
        validate_photo(updates["photo_media_id"], current_user, db)
    for field, value in updates.items():
        setattr(entry, field, value)
    db.commit()
    db.refresh(entry)
    return entry


@router.delete("/{entry_date}", status_code=status.HTTP_204_NO_CONTENT)
def delete_daily_entry(
    entry_date: date,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    entry = get_user_entry(entry_date, current_user, db)
    if entry is None:
        raise HTTPException(status_code=404, detail="Registro diário não encontrado.")
    db.delete(entry)
    db.commit()
    return None
