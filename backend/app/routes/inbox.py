from datetime import datetime, time, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models import Event, InboxItem, Project, StudySession, Subject, Task, User
from app.schemas import InboxConvert, InboxItemCreate, InboxItemResponse, InboxItemUpdate

router = APIRouter(prefix="/inbox", tags=["Inbox"])


def get_user_inbox_item(item_id: int, user_id: int, db: Session) -> InboxItem | None:
    return db.scalar(select(InboxItem).where(InboxItem.id == item_id, InboxItem.user_id == user_id).with_for_update())


def validate_subject(subject_id: int | None, user_id: int, db: Session) -> None:
    if subject_id is None:
        return
    subject = db.scalar(select(Subject).where(Subject.id == subject_id, Subject.user_id == user_id))
    if subject is None:
        raise HTTPException(status_code=404, detail="Matéria não encontrada.")


@router.get("", response_model=list[InboxItemResponse])
def list_inbox_items(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return db.scalars(
        select(InboxItem)
        .where(InboxItem.user_id == current_user.id)
        .order_by(InboxItem.created_at.desc(), InboxItem.id.desc())
    ).all()


@router.post("", response_model=InboxItemResponse, status_code=status.HTTP_201_CREATED)
def create_inbox_item(
    data: InboxItemCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    validate_subject(data.optional_subject_id, current_user.id, db)
    item = InboxItem(
        user_id=current_user.id,
        subject_id=data.optional_subject_id,
        text=data.text,
        note=data.note,
        optional_date=data.optional_date,
        optional_time=data.optional_time,
        status=data.status if data.status in {"new", "processed"} else "new",
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.patch("/{item_id}", response_model=InboxItemResponse)
def update_inbox_item(
    item_id: int,
    data: InboxItemUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    item = get_user_inbox_item(item_id, current_user.id, db)
    if item is None:
        raise HTTPException(status_code=404, detail="Item da Inbox não encontrado.")

    updates = data.model_dump(exclude_unset=True)
    if any(updates.get(field, "") is None for field in ("text", "note", "status")):
        raise HTTPException(status_code=422, detail="Texto, observação e status não podem ser nulos.")
    if item.converted_type and updates.get("status") == "new":
        raise HTTPException(status_code=409, detail="Este item já foi convertido.")
    subject_id = updates.get("optional_subject_id")
    if subject_id is not None:
        validate_subject(subject_id, current_user.id, db)

    if "optional_subject_id" in updates:
        item.subject_id = updates["optional_subject_id"]

    for field, value in updates.items():
        if field == "optional_subject_id":
            continue
        setattr(item, field, value)

    db.commit()
    db.refresh(item)
    return item


@router.delete("/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_inbox_item(
    item_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    item = get_user_inbox_item(item_id, current_user.id, db)
    if item is None:
        raise HTTPException(status_code=404, detail="Item da Inbox não encontrado.")
    db.delete(item)
    db.commit()
    return None


@router.post("/{item_id}/convert", response_model=InboxItemResponse)
def convert_inbox_item(
    item_id: int,
    data: InboxConvert,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # A row lock serializes double clicks and concurrent requests. The entity and
    # receipt are committed together; any error rolls back both.
    item = db.scalar(select(InboxItem).where(
        InboxItem.id == item_id, InboxItem.user_id == current_user.id
    ).with_for_update())
    if item is None:
        raise HTTPException(status_code=404, detail="Item da Inbox não encontrado.")
    if item.converted_type:
        if item.converted_type != data.target:
            raise HTTPException(status_code=409, detail="Este item já foi convertido para outro tipo.")
        return item
    validate_subject(item.subject_id, current_user.id, db)
    common = {"user_id": current_user.id, "subject_id": item.subject_id}
    day = item.optional_date or data.date
    local_zone = timezone(timedelta(minutes=-data.timezone_offset_minutes))
    captured_at = datetime.combine(day, item.optional_time or time.min, local_zone) if day else None
    entity = None
    if data.target == "task":
        entity = Task(**common, text=item.text, description=item.note, due_date=day)
        if item.optional_time and captured_at:
            entity.due_at = captured_at
    elif data.target == "event":
        if captured_at is None:
            raise HTTPException(status_code=422, detail="Informe a data do evento.")
        if len(item.text) > 200:
            raise HTTPException(status_code=422, detail="Edite o texto para até 200 caracteres para criar um evento.")
        entity = Event(**common, title=item.text, description=item.note,
                       starts_at=captured_at, all_day=item.optional_time is None)
    elif data.target == "study":
        subject = db.get(Subject, item.subject_id) if item.subject_id else None
        name = subject.name if subject else data.subject
        if not day or not data.duration_minutes or not name:
            raise HTTPException(status_code=422, detail="Informe data, matéria e duração do estudo.")
        if len(item.text) > 200:
            raise HTTPException(status_code=422, detail="Edite o texto para até 200 caracteres para registrar um estudo.")
        entity = StudySession(**common, subject=name, topic=item.text,
                              study_date=day, duration_minutes=data.duration_minutes, notes=item.note)
    elif data.target == "project":
        if len(item.text) > 160:
            raise HTTPException(status_code=422, detail="Edite o texto para até 160 caracteres para criar um projeto.")
        entity = Project(**common, title=item.text, description=item.note, due_date=day)
    if entity is not None:
        db.add(entity)
        db.flush()
    item.status = "processed"
    item.processed_at = datetime.now(timezone.utc)
    item.converted_type = data.target
    item.converted_id = entity.id if entity is not None else None
    db.commit()
    db.refresh(item)
    return item
