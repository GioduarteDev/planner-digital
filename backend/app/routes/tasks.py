from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models import Category, Page, Project, Subject, Task, User
from app.routes.helpers import get_user_page_or_404
from app.schemas import TaskCreate, TaskResponse, TaskUpdate

router = APIRouter(tags=["Tarefas"])


def get_user_task(task_id: int, user_id: int, db: Session) -> Task | None:
    return db.scalar(
        select(Task).where(Task.id == task_id, Task.user_id == user_id)
    )


def validate_links(
    *,
    user_id: int,
    db: Session,
    project_id: int | None = None,
    subject_id: int | None = None,
    category_id: int | None = None,
) -> None:
    if project_id is not None:
        project = db.scalar(
            select(Project).where(Project.id == project_id, Project.user_id == user_id)
        )
        if project is None:
            raise HTTPException(status_code=404, detail="Projeto não encontrado.")
    if subject_id is not None:
        subject = db.scalar(
            select(Subject).where(Subject.id == subject_id, Subject.user_id == user_id)
        )
        if subject is None:
            raise HTTPException(status_code=404, detail="Matéria não encontrada.")
    if category_id is not None:
        category = db.scalar(
            select(Category).where(Category.id == category_id, Category.user_id == user_id)
        )
        if category is None:
            raise HTTPException(status_code=404, detail="Categoria não encontrada.")


def build_task(
    data: TaskCreate,
    current_user: User,
    page_id: int | None,
) -> Task:
    return Task(
        user_id=current_user.id,
        page_id=page_id,
        text=data.text,
        description=data.description,
        done=False,
        due_date=data.due_date,
        due_at=data.due_at,
        priority=data.priority,
        project_id=data.project_id,
        subject_id=data.subject_id,
        category_id=data.category_id,
        show_in_calendar=data.show_in_calendar,
    )


@router.get("/tasks", response_model=list[TaskResponse])
def list_all_tasks(
    due_from: date | None = Query(default=None),
    due_to: date | None = Query(default=None),
    done: bool | None = Query(default=None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if due_from is not None and due_to is not None and due_to < due_from:
        raise HTTPException(status_code=400, detail="A data final não pode ser anterior à inicial.")
    query = select(Task).where(Task.user_id == current_user.id)
    if due_from is not None:
        query = query.where(Task.due_date >= due_from)
    if due_to is not None:
        query = query.where(Task.due_date <= due_to)
    if done is not None:
        query = query.where(Task.done == done)
    return db.scalars(query.order_by(Task.due_date, Task.created_at, Task.id)).all()


@router.get("/pages/{page_id}/tasks", response_model=list[TaskResponse])
def list_page_tasks(
    page_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    get_user_page_or_404(page_id, current_user, db)
    return db.scalars(
        select(Task)
        .where(Task.user_id == current_user.id, Task.page_id == page_id)
        .order_by(Task.created_at, Task.id)
    ).all()


@router.get("/tasks/{task_id}", response_model=TaskResponse)
def get_task(
    task_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    task = get_user_task(task_id, current_user.id, db)
    if task is None:
        raise HTTPException(status_code=404, detail="Tarefa não encontrada.")
    return task


@router.post("/tasks", response_model=TaskResponse, status_code=status.HTTP_201_CREATED)
def create_independent_task(
    data: TaskCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    validate_links(
        user_id=current_user.id,
        db=db,
        project_id=data.project_id,
        subject_id=data.subject_id,
        category_id=data.category_id,
    )
    task = build_task(data, current_user, None)
    db.add(task)
    db.commit()
    db.refresh(task)
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
    current_user: User = Depends(get_current_user),
):
    get_user_page_or_404(page_id, current_user, db)
    validate_links(
        user_id=current_user.id,
        db=db,
        project_id=data.project_id,
        subject_id=data.subject_id,
        category_id=data.category_id,
    )
    task = build_task(data, current_user, page_id)
    db.add(task)
    db.commit()
    db.refresh(task)
    return task


@router.patch("/tasks/{task_id}", response_model=TaskResponse)
def update_task(
    task_id: int,
    data: TaskUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    task = get_user_task(task_id, current_user.id, db)
    if task is None:
        raise HTTPException(status_code=404, detail="Tarefa não encontrada.")

    updates = data.model_dump(exclude_unset=True)

    if "page_id" in updates and updates["page_id"] is not None:
        get_user_page_or_404(updates["page_id"], current_user, db)

    validate_links(
        user_id=current_user.id,
        db=db,
        project_id=updates.get("project_id") if "project_id" in updates else None,
        subject_id=updates.get("subject_id") if "subject_id" in updates else None,
        category_id=updates.get("category_id") if "category_id" in updates else None,
    )

    for field, value in updates.items():
        setattr(task, field, value)

    db.commit()
    db.refresh(task)
    return task


@router.delete("/tasks/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_task(
    task_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    task = get_user_task(task_id, current_user.id, db)
    if task is None:
        raise HTTPException(status_code=404, detail="Tarefa não encontrada.")
    db.delete(task)
    db.commit()
    return None
