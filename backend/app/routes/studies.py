from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    status,
)

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import (
    get_current_user,
)

from app.models import (
    StudySession,
    User,
)

from app.schemas import (
    StudySessionCreate,
    StudySessionResponse,
    StudySessionUpdate,
)


router = APIRouter(
    prefix="/studies",
    tags=["Estudos"],
)


def get_user_study_session(
    session_id: int,
    user_id: int,
    db: Session,
) -> StudySession | None:
    return db.scalar(
        select(StudySession)
        .where(
            StudySession.id == session_id,
            StudySession.user_id == user_id,
        )
    )


@router.get(
    "",
    response_model=list[
        StudySessionResponse
    ],
)
def list_study_sessions(
    db: Session = Depends(
        get_db
    ),

    current_user: User = Depends(
        get_current_user
    ),
):
    statement = (
        select(StudySession)
        .where(
            StudySession.user_id
            == current_user.id
        )
        .order_by(
            StudySession.study_date.desc(),
            StudySession.id.desc(),
        )
    )

    return db.scalars(
        statement
    ).all()


@router.get(
    "/{session_id}",
    response_model=StudySessionResponse,
)
def get_study_session(
    session_id: int,

    db: Session = Depends(
        get_db
    ),

    current_user: User = Depends(
        get_current_user
    ),
):
    session = get_user_study_session(
        session_id,
        current_user.id,
        db,
    )

    if session is None:
        raise HTTPException(
            status_code=404,
            detail=(
                "Registro de estudo "
                "não encontrado."
            ),
        )

    return session


@router.post(
    "",
    response_model=StudySessionResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_study_session(
    data: StudySessionCreate,

    db: Session = Depends(
        get_db
    ),

    current_user: User = Depends(
        get_current_user
    ),
):
    session = StudySession(
        user_id=current_user.id,
        subject=data.subject,
        topic=data.topic,
        study_date=data.study_date,
        duration_minutes=(
            data.duration_minutes
        ),
        notes=data.notes,
    )

    db.add(session)
    db.commit()
    db.refresh(session)

    return session


@router.patch(
    "/{session_id}",
    response_model=StudySessionResponse,
)
def update_study_session(
    session_id: int,
    data: StudySessionUpdate,

    db: Session = Depends(
        get_db
    ),

    current_user: User = Depends(
        get_current_user
    ),
):
    session = get_user_study_session(
        session_id,
        current_user.id,
        db,
    )

    if session is None:
        raise HTTPException(
            status_code=404,
            detail=(
                "Registro de estudo "
                "não encontrado."
            ),
        )

    update_data = data.model_dump(
        exclude_unset=True
    )

    for (
        field,
        value,
    ) in update_data.items():
        setattr(
            session,
            field,
            value,
        )

    db.commit()
    db.refresh(session)

    return session


@router.delete(
    "/{session_id}",
    status_code=(
        status.HTTP_204_NO_CONTENT
    ),
)
def delete_study_session(
    session_id: int,

    db: Session = Depends(
        get_db
    ),

    current_user: User = Depends(
        get_current_user
    ),
):
    session = get_user_study_session(
        session_id,
        current_user.id,
        db,
    )

    if session is None:
        raise HTTPException(
            status_code=404,
            detail=(
                "Registro de estudo "
                "não encontrado."
            ),
        )

    db.delete(session)
    db.commit()