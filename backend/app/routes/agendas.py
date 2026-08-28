from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    status,
)

from sqlalchemy import (
    func,
    select,
)

from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import (
    get_current_user,
)

from app.models import (
    Agenda,
    Page,
    User,
)

from app.schemas import (
    AgendaCreate,
    AgendaResponse,
    AgendaUpdate,
)


MAX_AGENDAS = 6


router = APIRouter(
    prefix="/agendas",
    tags=["Agendas"],
)


@router.get(
    "",
    response_model=list[AgendaResponse],
)
def list_agendas(
    db: Session = Depends(
        get_db
    ),

    current_user: User = Depends(
        get_current_user
    ),
):
    statement = (
        select(Agenda)
        .where(
            Agenda.user_id
            == current_user.id
        )
        .order_by(
            Agenda.created_at
        )
    )

    return db.scalars(
        statement
    ).all()


@router.get(
    "/{agenda_id}",
    response_model=AgendaResponse,
)
def get_agenda(
    agenda_id: int,

    db: Session = Depends(
        get_db
    ),

    current_user: User = Depends(
        get_current_user
    ),
):
    agenda = db.scalar(
        select(Agenda)
        .where(
            Agenda.id == agenda_id,
            Agenda.user_id
            == current_user.id,
        )
    )

    if agenda is None:
        raise HTTPException(
            status_code=404,
            detail=(
                "Agenda não encontrada."
            ),
        )

    return agenda


@router.post(
    "",
    response_model=AgendaResponse,
    status_code=(
        status.HTTP_201_CREATED
    ),
)
def create_agenda(
    data: AgendaCreate,

    db: Session = Depends(
        get_db
    ),

    current_user: User = Depends(
        get_current_user
    ),
):
    agenda_count = db.scalar(
        select(
            func.count()
        )
        .select_from(Agenda)
        .where(
            Agenda.user_id
            == current_user.id
        )
    )

    agenda_count = (
        agenda_count or 0
    )

    if (
        agenda_count >=
        MAX_AGENDAS
    ):
        raise HTTPException(
            status_code=400,
            detail=(
                "Você pode ter no máximo "
                "6 agendas ativas."
            ),
        )

    agenda = Agenda(
        user_id=current_user.id,
        title=data.title,
        cover_color=(
            data.cover_color
        ),
    )

    for page_number in range(
        1,
        6,
    ):
        agenda.pages.append(
            Page(
                title=(
                    f"Página "
                    f"{page_number}"
                ),
                content="",
                favorite=False,
            )
        )

    db.add(agenda)
    db.commit()
    db.refresh(agenda)

    return agenda


@router.patch(
    "/{agenda_id}",
    response_model=AgendaResponse,
)
def update_agenda(
    agenda_id: int,
    data: AgendaUpdate,

    db: Session = Depends(
        get_db
    ),

    current_user: User = Depends(
        get_current_user
    ),
):
    agenda = db.scalar(
        select(Agenda)
        .where(
            Agenda.id == agenda_id,
            Agenda.user_id
            == current_user.id,
        )
    )

    if agenda is None:
        raise HTTPException(
            status_code=404,
            detail=(
                "Agenda não encontrada."
            ),
        )

    update_data = (
        data.model_dump(
            exclude_unset=True
        )
    )

    for (
        field,
        value,
    ) in update_data.items():
        setattr(
            agenda,
            field,
            value,
        )

    db.commit()
    db.refresh(agenda)

    return agenda


@router.delete(
    "/{agenda_id}",
    status_code=(
        status.HTTP_204_NO_CONTENT
    ),
)
def delete_agenda(
    agenda_id: int,

    db: Session = Depends(
        get_db
    ),

    current_user: User = Depends(
        get_current_user
    ),
):
    agenda = db.scalar(
        select(Agenda)
        .where(
            Agenda.id == agenda_id,
            Agenda.user_id
            == current_user.id,
        )
    )

    if agenda is None:
        raise HTTPException(
            status_code=404,
            detail=(
                "Agenda não encontrada."
            ),
        )

    db.delete(agenda)
    db.commit()