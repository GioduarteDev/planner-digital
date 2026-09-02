from fastapi import (
    APIRouter,
    Depends,
    Query,
)

from sqlalchemy import (
    or_,
    select,
)

from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import (
    get_current_user,
)

from app.models import (
    Agenda,
    Event,
    Page,
    StudySession,
    Task,
    User,
)

from app.schemas import SearchResult


router = APIRouter(
    prefix="/search",
    tags=["Busca"],
)


@router.get(
    "",
    response_model=list[SearchResult],
)
def search_planner(
    q: str = Query(
        min_length=1,
        max_length=100,
    ),

    db: Session = Depends(
        get_db
    ),

    current_user: User = Depends(
        get_current_user
    ),
):
    query = (
        q.strip()
        .lower()
    )

    pattern = (
        f"%{query}%"
    )

    results: list[
        SearchResult
    ] = []


    # =====================
    # AGENDAS
    # =====================

    agendas = db.scalars(
        select(Agenda)
        .where(
            Agenda.user_id
            == current_user.id,

            Agenda.title
            .ilike(pattern),
        )
        .limit(10)
    ).all()


    for agenda in agendas:
        results.append(
            SearchResult(
                type="agenda",
                id=agenda.id,
                title=agenda.title,
                subtitle="Agenda",
                agenda_id=agenda.id,
            )
        )


    # =====================
    # PÁGINAS
    # =====================

    pages = db.scalars(
        select(Page)
        .join(
            Agenda,
            Page.agenda_id
            == Agenda.id,
        )
        .where(
            Agenda.user_id
            == current_user.id,

            or_(
                Page.title
                .ilike(pattern),

                Page.content
                .ilike(pattern),
            ),
        )
        .limit(20)
    ).all()


    for page in pages:
        results.append(
            SearchResult(
                type="page",
                id=page.id,
                title=page.title,
                subtitle="Página",
                agenda_id=page.agenda_id,
                page_id=page.id,
            )
        )


    # =====================
    # TAREFAS
    # =====================

    tasks = db.scalars(
        select(Task)
        .join(
            Page,
            Task.page_id
            == Page.id,
        )
        .join(
            Agenda,
            Page.agenda_id
            == Agenda.id,
        )
        .where(
            Agenda.user_id
            == current_user.id,

            Task.text
            .ilike(pattern),
        )
        .limit(20)
    ).all()


    for task in tasks:
        page = db.get(
            Page,
            task.page_id,
        )

        results.append(
            SearchResult(
                type="task",
                id=task.id,
                title=task.text,
                subtitle="Tarefa",
                agenda_id=(
                    page.agenda_id
                    if page
                    else None
                ),
                page_id=task.page_id,
            )
        )


    # =====================
    # EVENTOS
    # =====================

    events = db.scalars(
        select(Event)
        .where(
            Event.user_id
            == current_user.id,

            or_(
                Event.title
                .ilike(pattern),

                Event.description
                .ilike(pattern),
            ),
        )
        .limit(10)
    ).all()


    for event in events:
        results.append(
            SearchResult(
                type="event",
                id=event.id,
                title=event.title,
                subtitle="Evento",
            )
        )


    # =====================
    # ESTUDOS
    # =====================

    studies = db.scalars(
        select(StudySession)
        .where(
            StudySession.user_id
            == current_user.id,

            or_(
                StudySession.subject
                .ilike(pattern),

                StudySession.topic
                .ilike(pattern),

                StudySession.notes
                .ilike(pattern),
            ),
        )
        .limit(10)
    ).all()


    for study in studies:
        subtitle = (
            study.topic
            if study.topic
            else "Estudo"
        )

        results.append(
            SearchResult(
                type="study",
                id=study.id,
                title=study.subject,
                subtitle=subtitle,
            )
        )


    return results