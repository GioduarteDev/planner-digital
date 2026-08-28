from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    status,
)

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Page, Task
from app.schemas import (
    TaskCreate,
    TaskResponse,
    TaskUpdate,
)


router = APIRouter(
    tags=["Tarefas"],
)


@router.get(
    "/tasks",
    response_model=list[TaskResponse],
)
def list_all_tasks(
    db: Session = Depends(get_db),
):
    statement = (
        select(Task)
        .order_by(
            Task.created_at,
            Task.id,
        )
    )

    return db.scalars(statement).all()


@router.get(
    "/pages/{page_id}/tasks",
    response_model=list[TaskResponse],
)
def list_page_tasks(
    page_id: int,
    db: Session = Depends(get_db),
):
    page = db.get(
        Page,
        page_id,
    )

    if page is None:
        raise HTTPException(
            status_code=404,
            detail="Página não encontrada.",
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

    return db.scalars(statement).all()


@router.get(
    "/tasks/{task_id}",
    response_model=TaskResponse,
)
def get_task(
    task_id: int,
    db: Session = Depends(get_db),
):
    task = db.get(
        Task,
        task_id,
    )

    if task is None:
        raise HTTPException(
            status_code=404,
            detail="Tarefa não encontrada.",
        )

    return task


@router.post(
    "/pages/{page_id}/tasks",
    response_model=TaskResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_task(
    page_id: int,
    data: TaskCreate,
    db: Session = Depends(get_db),
):
    page = db.get(
        Page,
        page_id,
    )

    if page is None:
        raise HTTPException(
            status_code=404,
            detail="Página não encontrada.",
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
    db: Session = Depends(get_db),
):
    task = db.get(
        Task,
        task_id,
    )

    if task is None:
        raise HTTPException(
            status_code=404,
            detail="Tarefa não encontrada.",
        )

    update_data = data.model_dump(
        exclude_unset=True
    )

    for field, value in update_data.items():
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
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_task(
    task_id: int,
    db: Session = Depends(get_db),
):
    task = db.get(
        Task,
        task_id,
    )

    if task is None:
        raise HTTPException(
            status_code=404,
            detail="Tarefa não encontrada.",
        )

    db.delete(task)
    db.commit()