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
    Agenda,
    Page,
    Task,
    User,
)

from app.schemas import (
    TaskCreate,
    TaskResponse,
    TaskUpdate,
)


router = APIRouter(
    tags=["Tarefas"],
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


def get_user_task(
    task_id: int,
    user_id: int,
    db: Session,
) -> Task | None:
    return db.scalar(
        select(Task)
        .join(
            Page,
            Task.page_id == Page.id,
        )
        .join(
            Agenda,
            Page.agenda_id == Agenda.id,
        )
        .where(
            Task.id == task_id,
            Agenda.user_id == user_id,
        )
    )


@router.get(
    "/tasks",
    response_model=list[TaskResponse],
)
def list_all_tasks(
    db: Session = Depends(
        get_db
    ),

    current_user: User = Depends(
        get_current_user
    ),
):
    statement = (
        select(Task)
        .join(
            Page,
            Task.page_id == Page.id,
        )
        .join(
            Agenda,
            Page.agenda_id == Agenda.id,
        )
        .where(
            Agenda.user_id
            == current_user.id
        )
        .order_by(
            Task.created_at,
            Task.id,
        )
    )

    return db.scalars(
        statement
    ).all()


@router.get(
    "/pages/{page_id}/tasks",
    response_model=list[TaskResponse],
)
def list_page_tasks(
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

    statement = (
        select(Task)
        .where(
            Task.page_id == page_id
        )
        .order_by(
            Task.created_at,
            Task.id,
        )
    )

    return db.scalars(
        statement
    ).all()


@router.get(
    "/tasks/{task_id}",
    response_model=TaskResponse,
)
def get_task(
    task_id: int,

    db: Session = Depends(
        get_db
    ),

    current_user: User = Depends(
        get_current_user
    ),
):
    task = get_user_task(
        task_id,
        current_user.id,
        db,
    )

    if task is None:
        raise HTTPException(
            status_code=404,
            detail=(
                "Tarefa não encontrada."
            ),
        )

    return task


@router.post(
    "/pages/{page_id}/tasks",
    response_model=TaskResponse,
    status_code=(
        status.HTTP_201_CREATED
    ),
)
def create_task(
    page_id: int,
    data: TaskCreate,

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

    task = Task(
        page_id=page_id,
        text=data.text,
        done=False,
        due_date=data.due_date,
        priority=data.priority,
    )

    db.add(task)
    db.commit()
    db.refresh(task)

    return task


@router.patch(
    "/tasks/{task_id}",
    response_model=TaskResponse,
)
def update_task(
    task_id: int,
    data: TaskUpdate,

    db: Session = Depends(
        get_db
    ),

    current_user: User = Depends(
        get_current_user
    ),
):
    task = get_user_task(
        task_id,
        current_user.id,
        db,
    )

    if task is None:
        raise HTTPException(
            status_code=404,
            detail=(
                "Tarefa não encontrada."
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
            task,
            field,
            value,
        )

    db.commit()
    db.refresh(task)

    return task


@router.delete(
    "/tasks/{task_id}",
    status_code=(
        status.HTTP_204_NO_CONTENT
    ),
)
def delete_task(
    task_id: int,

    db: Session = Depends(
        get_db
    ),

    current_user: User = Depends(
        get_current_user
    ),
):
    task = get_user_task(
        task_id,
        current_user.id,
        db,
    )

    if task is None:
        raise HTTPException(
            status_code=404,
            detail=(
                "Tarefa não encontrada."
            ),
        )

    db.delete(task)
    db.commit()