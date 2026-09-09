from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models import Project, StudySession, Subject, User
from app.schemas import StudySessionCreate, StudySessionResponse, StudySessionUpdate

router = APIRouter(prefix="/studies", tags=["Estudos"])


def get_user_study_session(session_id: int, user_id: int, db: Session) -> StudySession | None:
    return db.scalar(
        select(StudySession).where(
            StudySession.id == session_id,
            StudySession.user_id == user_id,
        )
    )


def validate_links(
    *,
    user_id: int,
    db: Session,
    project_id: int | None,
    subject_id: int | None,
) -> Subject | None:
    if project_id is not None:
        project = db.scalar(
            select(Project).where(Project.id == project_id, Project.user_id == user_id)
        )
        if project is None:
            raise HTTPException(status_code=404, detail="Projeto não encontrado.")

    subject = None
    if subject_id is not None:
        subject = db.scalar(
            select(Subject).where(Subject.id == subject_id, Subject.user_id == user_id)
        )
        if subject is None:
            raise HTTPException(status_code=404, detail="Matéria não encontrada.")
    return subject


@router.get("", response_model=list[StudySessionResponse])
def list_study_sessions(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return db.scalars(
        select(StudySession)
        .where(StudySession.user_id == current_user.id)
        .order_by(StudySession.study_date.desc(), StudySession.id.desc())
    ).all()


@router.get("/{session_id}", response_model=StudySessionResponse)
def get_study_session(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    session = get_user_study_session(session_id, current_user.id, db)
    if session is None:
        raise HTTPException(status_code=404, detail="Registro de estudo não encontrado.")
    return session


@router.post("", response_model=StudySessionResponse, status_code=status.HTTP_201_CREATED)
def create_study_session(
    data: StudySessionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    subject_ref = validate_links(
        user_id=current_user.id,
        db=db,
        project_id=data.project_id,
        subject_id=data.subject_id,
    )
    subject_name = subject_ref.name if subject_ref is not None else data.subject

    session = StudySession(
        user_id=current_user.id,
        project_id=data.project_id,
        subject_id=data.subject_id,
        subject=subject_name,
        topic=data.topic,
        study_date=data.study_date,
        duration_minutes=data.duration_minutes,
        notes=data.notes,
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    return session


@router.patch("/{session_id}", response_model=StudySessionResponse)
def update_study_session(
    session_id: int,
    data: StudySessionUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    session = get_user_study_session(session_id, current_user.id, db)
    if session is None:
        raise HTTPException(status_code=404, detail="Registro de estudo não encontrado.")

    updates = data.model_dump(exclude_unset=True)
    subject_ref = validate_links(
        user_id=current_user.id,
        db=db,
        project_id=updates.get("project_id") if "project_id" in updates else None,
        subject_id=updates.get("subject_id") if "subject_id" in updates else None,
    )

    for field, value in updates.items():
        setattr(session, field, value)
    if subject_ref is not None:
        session.subject = subject_ref.name

    db.commit()
    db.refresh(session)
    return session


@router.delete("/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_study_session(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    session = get_user_study_session(session_id, current_user.id, db)
    if session is None:
        raise HTTPException(status_code=404, detail="Registro de estudo não encontrado.")
    db.delete(session)
    db.commit()
    return None
