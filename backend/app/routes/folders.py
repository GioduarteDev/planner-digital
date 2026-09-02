from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    status,
)

from sqlalchemy import (
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
    User,
)

from app.schemas import (
    FolderCreate,
    FolderReorderRequest,
    FolderResponse,
    FolderUpdate,
)


router = APIRouter(
    tags=["Pastas"],
)


def get_user_agenda(
    agenda_id: int,
    db: Session,
    current_user: User,
) -> Agenda:
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
            detail="Agenda não encontrada.",
        )

    return agenda


def get_user_folder(
    folder_id: int,
    db: Session,
    current_user: User,
) -> Folder:
    folder = db.scalar(
        select(Folder)
        .join(
            Agenda,
            Folder.agenda_id
            == Agenda.id,
        )
        .where(
            Folder.id == folder_id,
            Agenda.user_id
            == current_user.id,
        )
    )

    if folder is None:
        raise HTTPException(
            status_code=404,
            detail="Pasta não encontrada.",
        )

    return folder


@router.get(
    "/agendas/{agenda_id}/folders",
    response_model=list[FolderResponse],
)
def list_folders(
    agenda_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        get_current_user
    ),
):
    get_user_agenda(
        agenda_id,
        db,
        current_user,
    )

    folders = db.scalars(
        select(Folder)
        .where(
            Folder.agenda_id
            == agenda_id
        )
        .order_by(
            Folder.position,
            Folder.id,
        )
    ).all()

    return folders


@router.post(
    "/agendas/{agenda_id}/folders",
    response_model=FolderResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_folder(
    agenda_id: int,
    data: FolderCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        get_current_user
    ),
):
    get_user_agenda(
        agenda_id,
        db,
        current_user,
    )

    last_position = db.scalar(
        select(Folder.position)
        .where(
            Folder.agenda_id
            == agenda_id
        )
        .order_by(
            Folder.position.desc()
        )
        .limit(1)
    )

    new_position = (
        last_position + 1
        if last_position is not None
        else 0
    )

    folder = Folder(
        agenda_id=agenda_id,
        title=data.title,
        position=new_position,
    )

    db.add(folder)
    db.commit()
    db.refresh(folder)

    return folder


@router.patch(
    "/folders/{folder_id}",
    response_model=FolderResponse,
)
def update_folder(
    folder_id: int,
    data: FolderUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        get_current_user
    ),
):
    folder = get_user_folder(
        folder_id,
        db,
        current_user,
    )

    updates = data.model_dump(
        exclude_unset=True
    )

    for field, value in updates.items():
        setattr(
            folder,
            field,
            value,
        )

    db.commit()
    db.refresh(folder)

    return folder


@router.delete(
    "/folders/{folder_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_folder(
    folder_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        get_current_user
    ),
):
    folder = get_user_folder(
        folder_id,
        db,
        current_user,
    )

    db.delete(folder)
    db.commit()

@router.patch(
    "/agendas/{agenda_id}/folders/reorder",
    response_model=list[FolderResponse],
)
def reorder_folders(
    agenda_id: int,
    data: FolderReorderRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        get_current_user
    ),
):
    get_user_agenda(
        agenda_id,
        db,
        current_user,
    )

    folders = db.scalars(
        select(Folder)
        .where(
            Folder.agenda_id
            == agenda_id
        )
    ).all()

    existing_ids = {
        folder.id
        for folder in folders
    }

    received_ids = (
        data.folder_ids
    )

    if (
        len(received_ids)
        != len(set(received_ids))
    ):
        raise HTTPException(
            status_code=400,
            detail=(
                "A lista possui "
                "pastas duplicadas."
            ),
        )

    if (
        set(received_ids)
        != existing_ids
    ):
        raise HTTPException(
            status_code=400,
            detail=(
                "Envie todas as pastas "
                "da agenda exatamente "
                "uma vez."
            ),
        )

    folders_by_id = {
        folder.id: folder
        for folder in folders
    }

    for (
        position,
        folder_id,
    ) in enumerate(
        received_ids
    ):
        folders_by_id[
            folder_id
        ].position = position

    db.commit()

    return db.scalars(
        select(Folder)
        .where(
            Folder.agenda_id
            == agenda_id
        )
        .order_by(
            Folder.position,
            Folder.id,
        )
    ).all()   