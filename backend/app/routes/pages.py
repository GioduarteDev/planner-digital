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
    PageCreate,
    PageResponse,
    PageUpdate,
)


MAX_PAGES = 400


router = APIRouter(
    tags=["Páginas"],
)


def get_user_page(
    page_id: int,
    user_id: int,
    db: Session,
) -> Page | None:
    return db.scalar(
        select(Page)
        .join(
            Agenda,
            Page.agenda_id == Agenda.id,
        )
        .where(
            Page.id == page_id,
            Agenda.user_id == user_id,
        )
    )


@router.get(
    "/agendas/{agenda_id}/pages",
    response_model=list[PageResponse],
)
def list_pages(
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

    statement = (
        select(Page)
        .where(
            Page.agenda_id == agenda_id
        )
        .order_by(
            Page.created_at,
            Page.id,
        )
    )

    return db.scalars(
        statement
    ).all()


@router.get(
    "/pages/{page_id}",
    response_model=PageResponse,
)
def get_page(
    page_id: int,

    db: Session = Depends(
        get_db
    ),

    current_user: User = Depends(
        get_current_user
    ),
):
    page = get_user_page(
        page_id,
        current_user.id,
        db,
    )

    if page is None:
        raise HTTPException(
            status_code=404,
            detail=(
                "Página não encontrada."
            ),
        )

    return page


@router.post(
    "/agendas/{agenda_id}/pages",
    response_model=PageResponse,
    status_code=(
        status.HTTP_201_CREATED
    ),
)
def create_page(
    agenda_id: int,
    data: PageCreate,

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

    page_count = db.scalar(
        select(
            func.count()
        )
        .select_from(Page)
        .where(
            Page.agenda_id
            == agenda_id
        )
    )

    page_count = (
        page_count or 0
    )

    if (
        page_count >=
        MAX_PAGES
    ):
        raise HTTPException(
            status_code=400,
            detail=(
                "Uma agenda pode ter no "
                "máximo 400 páginas."
            ),
        )

    title = (
        data.title
        if data.title
        else f"Página {page_count + 1}"
    )

    page = Page(
        agenda_id=agenda_id,
        title=title,
        content="",
        favorite=False,
    )

    db.add(page)
    db.commit()
    db.refresh(page)

    return page


@router.patch(
    "/pages/{page_id}",
    response_model=PageResponse,
)
def update_page(
    page_id: int,
    data: PageUpdate,

    db: Session = Depends(
        get_db
    ),

    current_user: User = Depends(
        get_current_user
    ),
):
    page = get_user_page(
        page_id,
        current_user.id,
        db,
    )

    if page is None:
        raise HTTPException(
            status_code=404,
            detail=(
                "Página não encontrada."
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
            page,
            field,
            value,
        )

    db.commit()
    db.refresh(page)

    return page


@router.delete(
    "/pages/{page_id}",
    status_code=(
        status.HTTP_204_NO_CONTENT
    ),
)
def delete_page(
    page_id: int,

    db: Session = Depends(
        get_db
    ),

    current_user: User = Depends(
        get_current_user
    ),
):
    page = get_user_page(
        page_id,
        current_user.id,
        db,
    )

    if page is None:
        raise HTTPException(
            status_code=404,
            detail=(
                "Página não encontrada."
            ),
        )

    page_count = db.scalar(
        select(
            func.count()
        )
        .select_from(Page)
        .where(
            Page.agenda_id
            == page.agenda_id
        )
    )

    page_count = (
        page_count or 0
    )

    if page_count <= 1:
        raise HTTPException(
            status_code=400,
            detail=(
                "A agenda precisa ter "
                "pelo menos uma página."
            ),
        )

    db.delete(page)
    db.commit()