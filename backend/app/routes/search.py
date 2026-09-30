from fastapi import APIRouter, Depends, Query
from sqlalchemy import Text, cast, or_, select
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models import (
    Agenda,
    CanvasElement,
    Category,
    Event,
    MediaLibraryItem,
    Page,
    PageBlock,
    PageMedia,
    Project,
    StudySession,
    Subject,
    Task,
    User,
)
from app.schemas import SearchResult

router = APIRouter(prefix="/search", tags=["Busca"])


@router.get("", response_model=list[SearchResult])
def search_planner(
    q: str = Query(min_length=1, max_length=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    normalized_query = q.strip()
    if not normalized_query:
        return []

    pattern = f"%{normalized_query}%"
    results: list[SearchResult] = []

    agendas = db.scalars(
        select(Agenda).where(
            Agenda.user_id == current_user.id,
            Agenda.title.ilike(pattern),
        ).limit(10)
    ).all()
    for agenda in agendas:
        results.append(
            SearchResult(type="agenda", id=agenda.id, title=agenda.title, subtitle="Agenda", agenda_id=agenda.id)
        )

    pages = db.scalars(
        select(Page)
        .join(Agenda, Page.agenda_id == Agenda.id)
        .where(
            Agenda.user_id == current_user.id,
            or_(Page.title.ilike(pattern), Page.content.ilike(pattern)),
        )
        .limit(20)
    ).all()
    for page in pages:
        results.append(
            SearchResult(
                type="page",
                id=page.id,
                title=page.title,
                subtitle=f"Página · {page.agenda.title}",
                agenda_id=page.agenda_id,
                page_id=page.id,
            )
        )

    # O editor moderno salva boa parte do texto
    # dentro de PageBlock.data (JSON).
    # Retornamos a pagina correspondente para manter
    # compatibilidade com a busca atual do frontend.
    page_result_ids = {
        result.id
        for result in results
        if result.type == "page"
    }

    block_pages = db.scalars(
        select(Page)
        .join(
            PageBlock,
            PageBlock.page_id == Page.id,
        )
        .join(
            Agenda,
            Page.agenda_id == Agenda.id,
        )
        .where(
            Agenda.user_id == current_user.id,
            cast(
                PageBlock.data,
                Text,
            ).ilike(pattern),
        )
        .distinct(Page.id)
        .limit(20)
    ).all()

    for page in block_pages:
        if page.id in page_result_ids:
            continue

        results.append(
            SearchResult(
                type="page",
                id=page.id,
                title=page.title,
                subtitle=f"Conteúdo · {page.agenda.title}",
                agenda_id=page.agenda_id,
                page_id=page.id,
            )
        )

        page_result_ids.add(
            page.id
        )

    tasks = db.scalars(
        select(Task).where(
            Task.user_id == current_user.id,
            or_(Task.text.ilike(pattern), Task.description.ilike(pattern)),
        ).limit(20)
    ).all()
    for task in tasks:
        page = (
            db.scalar(
                select(Page)
                .join(Agenda, Page.agenda_id == Agenda.id)
                .where(
                    Page.id == task.page_id,
                    Agenda.user_id == current_user.id,
                )
            )
            if task.page_id is not None
            else None
        )
        results.append(
            SearchResult(
                type="task",
                id=task.id,
                title=task.text,
                subtitle=f"Tarefa · {page.agenda.title}" if page else "Tarefa",
                agenda_id=page.agenda_id if page else None,
                page_id=task.page_id,
            )
        )

    events = db.scalars(
        select(Event).where(
            Event.user_id == current_user.id,
            or_(Event.title.ilike(pattern), Event.description.ilike(pattern)),
        ).limit(10)
    ).all()
    for event in events:
        results.append(
            SearchResult(
                type="event",
                id=event.id,
                title=event.title,
                subtitle="Evento",
                target_date=event.starts_at.date().isoformat() if event.starts_at else None,
            )
        )

    studies = db.scalars(
        select(StudySession).where(
            StudySession.user_id == current_user.id,
            or_(
                (StudySession.subject_id.is_(None) & StudySession.subject.ilike(pattern)),
                StudySession.subject_ref.has(Subject.name.ilike(pattern)),
                StudySession.topic.ilike(pattern),
                StudySession.notes.ilike(pattern),
            ),
        ).limit(10)
    ).all()
    for study in studies:
        results.append(
            SearchResult(
                type="study",
                id=study.id,
                title=study.subject_name,
                subtitle=study.topic or "Estudo",
            )
        )

    projects = db.scalars(
        select(Project).where(
            Project.user_id == current_user.id,
            or_(Project.title.ilike(pattern), Project.description.ilike(pattern)),
        ).limit(10)
    ).all()
    for project in projects:
        results.append(SearchResult(type="project", id=project.id, title=project.title, subtitle="Projeto"))

    categories = db.scalars(
        select(Category).where(
            Category.user_id == current_user.id,
            Category.name.ilike(pattern),
        ).limit(10)
    ).all()
    for category in categories:
        results.append(SearchResult(type="category", id=category.id, title=category.name, subtitle="Categoria"))

    subjects = db.scalars(
        select(Subject).where(
            Subject.user_id == current_user.id,
            Subject.name.ilike(pattern),
        ).limit(10)
    ).all()
    for subject in subjects:
        results.append(SearchResult(type="subject", id=subject.id, title=subject.name, subtitle="Matéria"))

    media_items = db.scalars(
        select(MediaLibraryItem).where(
            MediaLibraryItem.user_id == current_user.id,
            or_(
                MediaLibraryItem.name.ilike(pattern),
                MediaLibraryItem.kit_name.ilike(pattern),
                cast(MediaLibraryItem.metadata_json, Text).ilike(pattern),
            ),
        ).limit(20)
    ).all()
    for media in media_items:
        results.append(
            SearchResult(
                type="media",
                id=media.id,
                title=media.name,
                subtitle=f"Mídia · {media.kit_name or media.media_type}",
            )
        )

    page_media_items = db.scalars(
        select(PageMedia)
        .join(Page, PageMedia.page_id == Page.id)
        .join(Agenda, Page.agenda_id == Agenda.id)
        .where(
            Agenda.user_id == current_user.id,
            PageMedia.original_name.ilike(pattern),
        )
        .limit(20)
    ).all()
    for media in page_media_items:
        results.append(
            SearchResult(
                type="media",
                id=media.id,
                title=media.original_name,
                subtitle=f"Mídia · {media.page.title} · {media.page.agenda.title}",
                agenda_id=media.page.agenda_id,
                page_id=media.page_id,
            )
        )

    # Texto de post-its, caixas de texto, checklists e outros elementos fica em JSON.
    elements = db.scalars(
        select(CanvasElement).where(
            CanvasElement.user_id == current_user.id,
            cast(CanvasElement.data, Text).ilike(pattern),
        ).limit(20)
    ).all()
    for element in elements:
        page = (
            db.scalar(
                select(Page)
                .join(Agenda, Page.agenda_id == Agenda.id)
                .where(
                    Page.id == element.page_id,
                    Agenda.user_id == current_user.id,
                )
            )
            if element.page_id is not None
            else None
        )
        label = element.data.get("text") if isinstance(element.data, dict) else None
        if not isinstance(label, str) or not label.strip():
            label = element.element_type
        results.append(
            SearchResult(
                type="canvas_element",
                id=element.id,
                title=label[:200],
                subtitle=f"Elemento · {element.surface_type}",
                agenda_id=page.agenda_id if page else None,
                page_id=element.page_id,
                target_path=(
                    {
                        "profile": "/profile",
                        "today": "/today",
                        "calendar": "/calendar",
                        "tasks": "/tasks",
                        "studies": "/studies",
                        "organization": "/organization",
                        "stationery": "/stationery",
                        "library": "/",
                    }.get(element.surface_type, "/")
                    if page is None
                    else None
                ),
            )
        )

    return results[:100]
