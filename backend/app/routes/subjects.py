from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models import Subject, User
from app.schemas import SubjectCreate, SubjectResponse, SubjectUpdate

router = APIRouter(prefix="/subjects", tags=["Matérias"])


def get_user_subject(subject_id: int, user_id: int, db: Session) -> Subject | None:
    return db.scalar(
        select(Subject).where(Subject.id == subject_id, Subject.user_id == user_id)
    )


@router.get("", response_model=list[SubjectResponse])
def list_subjects(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return db.scalars(
        select(Subject)
        .where(Subject.user_id == current_user.id)
        .order_by(Subject.name, Subject.id)
    ).all()


@router.post("", response_model=SubjectResponse, status_code=status.HTTP_201_CREATED)
def create_subject(
    data: SubjectCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    subject = Subject(user_id=current_user.id, name=data.name, color=data.color)
    db.add(subject)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Você já tem uma matéria com esse nome.")
    db.refresh(subject)
    return subject


@router.patch("/{subject_id}", response_model=SubjectResponse)
def update_subject(
    subject_id: int,
    data: SubjectUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    subject = get_user_subject(subject_id, current_user.id, db)
    if subject is None:
        raise HTTPException(status_code=404, detail="Matéria não encontrada.")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(subject, field, value)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Você já tem uma matéria com esse nome.")
    db.refresh(subject)
    return subject


@router.delete("/{subject_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_subject(
    subject_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    subject = get_user_subject(subject_id, current_user.id, db)
    if subject is None:
        raise HTTPException(status_code=404, detail="Matéria não encontrada.")
    db.delete(subject)
    db.commit()
    return None
