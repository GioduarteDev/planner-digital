from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models import Category, Event, Project, User
from app.schemas import EventCreate, EventResponse, EventUpdate

router = APIRouter(prefix="/events", tags=["Eventos"])


def get_user_event(event_id: int, user_id: int, db: Session) -> Event | None:
    return db.scalar(
        select(Event).where(Event.id == event_id, Event.user_id == user_id)
    )


def validate_links(
    *,
    user_id: int,
    db: Session,
    project_id: int | None,
    category_id: int | None,
) -> None:
    if project_id is not None:
        project = db.scalar(
            select(Project).where(Project.id == project_id, Project.user_id == user_id)
        )
        if project is None:
            raise HTTPException(status_code=404, detail="Projeto não encontrado.")
    if category_id is not None:
        category = db.scalar(
            select(Category).where(Category.id == category_id, Category.user_id == user_id)
        )
        if category is None:
            raise HTTPException(status_code=404, detail="Categoria não encontrada.")


@router.get("", response_model=list[EventResponse])
def list_events(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return db.scalars(
        select(Event)
        .where(Event.user_id == current_user.id)
        .order_by(Event.starts_at, Event.id)
    ).all()


@router.get("/{event_id}", response_model=EventResponse)
def get_event(
    event_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    event = get_user_event(event_id, current_user.id, db)
    if event is None:
        raise HTTPException(status_code=404, detail="Evento não encontrado.")
    return event


@router.post("", response_model=EventResponse, status_code=status.HTTP_201_CREATED)
def create_event(
    data: EventCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if data.ends_at is not None and data.ends_at < data.starts_at:
        raise HTTPException(status_code=400, detail="O término não pode ser anterior ao início.")

    validate_links(
        user_id=current_user.id,
        db=db,
        project_id=data.project_id,
        category_id=data.category_id,
    )

    event = Event(
        user_id=current_user.id,
        title=data.title,
        description=data.description,
        starts_at=data.starts_at,
        ends_at=data.ends_at,
        all_day=data.all_day,
        reminder_minutes=data.reminder_minutes,
        project_id=data.project_id,
        category_id=data.category_id,
        color=data.color,
    )
    db.add(event)
    db.commit()
    db.refresh(event)
    return event


@router.patch("/{event_id}", response_model=EventResponse)
def update_event(
    event_id: int,
    data: EventUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    event = get_user_event(event_id, current_user.id, db)
    if event is None:
        raise HTTPException(status_code=404, detail="Evento não encontrado.")

    updates = data.model_dump(exclude_unset=True)
    new_start = updates.get("starts_at", event.starts_at)
    new_end = updates.get("ends_at", event.ends_at)
    if new_end is not None and new_end < new_start:
        raise HTTPException(status_code=400, detail="O término não pode ser anterior ao início.")

    validate_links(
        user_id=current_user.id,
        db=db,
        project_id=updates.get("project_id") if "project_id" in updates else None,
        category_id=updates.get("category_id") if "category_id" in updates else None,
    )

    for field, value in updates.items():
        setattr(event, field, value)

    db.commit()
    db.refresh(event)
    return event


@router.delete("/{event_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_event(
    event_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    event = get_user_event(event_id, current_user.id, db)
    if event is None:
        raise HTTPException(status_code=404, detail="Evento não encontrado.")
    db.delete(event)
    db.commit()
    return None
