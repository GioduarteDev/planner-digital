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
    Folder,
    Page,
    User,
)

from app.schemas import (
    PageCreate,
    PageMoveFolder,
    PageReorderRequest,
    PageResponse,
    PageUpdate,
)


MAX_PAGES = 400


router = APIRouter(
    tags=["Páginas"],
)


# =========================
# BUSCAR PÁGINA DO USUÁRIO
# =========================

def get_user_page(
    page_id: int,
    user_id: int,
    db: Session,
) -> Page | None:
    return db.scalar(
        select(Page)
        .join(
            Agenda,
            Page.agenda_id
            == Agenda.id,
        )
        .where(
            Page.id == page_id,
            Agenda.user_id
            == user_id,
        )
    )


# =========================
# LISTAR PÁGINAS
# =========================

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
            Page.agenda_id
            == agenda_id
        )
        .order_by(
            Page.position,
            Page.created_at,
            Page.id,
        )
    )

    return db.scalars(
        statement
    ).all()


# =========================
# BUSCAR UMA PÁGINA
# =========================

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


# =========================
# CRIAR PÁGINA
# =========================

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
        page_count
        >= MAX_PAGES
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

    last_position = db.scalar(
        select(
            func.max(
                Page.position
            )
        )
        .where(
            Page.agenda_id
            == agenda_id,
            Page.folder_id.is_(
                None
            ),
        )
    )

    new_position = (
        last_position + 1
        if last_position
        is not None
        else 0
    )

    page = Page(
        agenda_id=agenda_id,
        folder_id=None,
        position=new_position,
        title=title,
        content="",
        favorite=False,
    )

    db.add(page)
    db.commit()
    db.refresh(page)

    return page


# =========================
# EDITAR PÁGINA
# =========================

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


# =========================
# MOVER PÁGINA PARA PASTA
# =========================

@router.patch(
    "/pages/{page_id}/folder",
    response_model=PageResponse,
)
def move_page_to_folder(
    page_id: int,
    data: PageMoveFolder,
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


    # =========================
    # VOLTAR PARA SEM PASTA
    # =========================

    if data.folder_id is None:
        last_position = db.scalar(
            select(
                func.max(
                    Page.position
                )
            )
            .where(
                Page.agenda_id
                == page.agenda_id,

                Page.folder_id.is_(
                    None
                ),

                Page.id
                != page.id,
            )
        )

        page.folder_id = None

        page.position = (
            last_position + 1
            if last_position
            is not None
            else 0
        )

        db.commit()
        db.refresh(page)

        return page


    # =========================
    # PROCURAR PASTA
    # =========================

    folder = db.scalar(
        select(Folder)
        .join(
            Agenda,
            Folder.agenda_id
            == Agenda.id,
        )
        .where(
            Folder.id
            == data.folder_id,

            Agenda.user_id
            == current_user.id,
        )
    )

    if folder is None:
        raise HTTPException(
            status_code=404,
            detail=(
                "Pasta não encontrada."
            ),
        )


    # =========================
    # SEGURANÇA
    # =========================

    if (
        folder.agenda_id
        != page.agenda_id
    ):
        raise HTTPException(
            status_code=400,
            detail=(
                "A página e a pasta "
                "precisam pertencer "
                "à mesma agenda."
            ),
        )


    # =========================
    # COLOCAR NO FINAL
    # DA NOVA PASTA
    # =========================

    last_position = db.scalar(
        select(
            func.max(
                Page.position
            )
        )
        .where(
            Page.agenda_id
            == page.agenda_id,

            Page.folder_id
            == folder.id,

            Page.id
            != page.id,
        )
    )

    page.folder_id = folder.id

    page.position = (
        last_position + 1
        if last_position
        is not None
        else 0
    )

    db.commit()
    db.refresh(page)

    return page


# =========================
# REORDENAR PÁGINAS
# =========================

@router.patch(
    "/agendas/{agenda_id}/pages/reorder",
    response_model=list[PageResponse],
)
def reorder_pages(
    agenda_id: int,
    data: PageReorderRequest,
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


    # =========================
    # VALIDAR PASTA
    # =========================

    if data.folder_id is not None:
        folder = db.scalar(
            select(Folder)
            .where(
                Folder.id
                == data.folder_id,

                Folder.agenda_id
                == agenda_id,
            )
        )

        if folder is None:
            raise HTTPException(
                status_code=404,
                detail=(
                    "Pasta não encontrada "
                    "nesta agenda."
                ),
            )


    # =========================
    # PEGAR PÁGINAS DO GRUPO
    # =========================

    statement = (
        select(Page)
        .where(
            Page.agenda_id
            == agenda_id
        )
    )

    if data.folder_id is None:
        statement = (
            statement.where(
                Page.folder_id.is_(
                    None
                )
            )
        )
    else:
        statement = (
            statement.where(
                Page.folder_id
                == data.folder_id
            )
        )

    group_pages = db.scalars(
        statement
    ).all()


    # =========================
    # VALIDAR IDs
    # =========================

    existing_ids = {
        page.id
        for page in group_pages
    }

    received_ids = (
        data.page_ids
    )

    if (
        len(received_ids)
        != len(set(received_ids))
    ):
        raise HTTPException(
            status_code=400,
            detail=(
                "A lista possui "
                "páginas duplicadas."
            ),
        )

    if (
        set(received_ids)
        != existing_ids
    ):
        raise HTTPException(
            status_code=400,
            detail=(
                "Envie todas as páginas "
                "desse grupo exatamente "
                "uma vez."
            ),
        )


    # =========================
    # SALVAR NOVA ORDEM
    # =========================

    pages_by_id = {
        page.id: page
        for page in group_pages
    }

    for (
        position,
        page_id,
    ) in enumerate(
        received_ids
    ):
        pages_by_id[
            page_id
        ].position = position

    db.commit()


    # =========================
    # DEVOLVER ORDENADO
    # =========================

    return db.scalars(
        statement.order_by(
            Page.position,
            Page.id,
        )
    ).all()


# =========================
# EXCLUIR PÁGINA
# =========================

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