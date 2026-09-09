from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models import Project, Task, User
from app.schemas import ProjectCreate, ProjectResponse, ProjectUpdate

router = APIRouter(prefix="/projects", tags=["Projetos"])


def get_user_project(project_id: int, user_id: int, db: Session) -> Project | None:
    return db.scalar(
        select(Project).where(Project.id == project_id, Project.user_id == user_id)
    )


@router.get("", response_model=list[ProjectResponse])
def list_projects(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return db.scalars(
        select(Project)
        .where(Project.user_id == current_user.id)
        .order_by(Project.created_at.desc(), Project.id.desc())
    ).all()


@router.post("", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED)
def create_project(
    data: ProjectCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    project = Project(user_id=current_user.id, **data.model_dump())
    db.add(project)
    db.commit()
    db.refresh(project)
    return project


@router.get("/{project_id}", response_model=ProjectResponse)
def get_project(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    project = get_user_project(project_id, current_user.id, db)
    if project is None:
        raise HTTPException(status_code=404, detail="Projeto não encontrado.")
    return project


@router.patch("/{project_id}", response_model=ProjectResponse)
def update_project(
    project_id: int,
    data: ProjectUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    project = get_user_project(project_id, current_user.id, db)
    if project is None:
        raise HTTPException(status_code=404, detail="Projeto não encontrado.")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(project, field, value)
    db.commit()
    db.refresh(project)
    return project


@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_project(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    project = get_user_project(project_id, current_user.id, db)
    if project is None:
        raise HTTPException(status_code=404, detail="Projeto não encontrado.")

    # As FKs usam SET NULL, então tarefas/eventos/estudos sobrevivem sem projeto.
    db.delete(project)
    db.commit()
    return None
