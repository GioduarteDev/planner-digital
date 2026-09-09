from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import (
    Agenda,
    Category,
    Page,
    Project,
    Subject,
    User,
)


def get_user_agenda_or_404(
    agenda_id: int,
    current_user: User,
    db: Session,
) -> Agenda:
    agenda = db.scalar(
        select(Agenda).where(
            Agenda.id == agenda_id,
            Agenda.user_id == current_user.id,
        )
    )
    if agenda is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Agenda não encontrada.",
        )
    return agenda


def get_user_page_or_404(
    page_id: int,
    current_user: User,
    db: Session,
) -> Page:
    page = db.scalar(
        select(Page)
        .join(Agenda, Page.agenda_id == Agenda.id)
        .where(
            Page.id == page_id,
            Agenda.user_id == current_user.id,
        )
    )
    if page is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Página não encontrada.",
        )
    return page


def get_user_project_or_404(
    project_id: int,
    current_user: User,
    db: Session,
) -> Project:
    project = db.scalar(
        select(Project).where(
            Project.id == project_id,
            Project.user_id == current_user.id,
        )
    )
    if project is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Projeto não encontrado.",
        )
    return project


def get_user_category_or_404(
    category_id: int,
    current_user: User,
    db: Session,
) -> Category:
    category = db.scalar(
        select(Category).where(
            Category.id == category_id,
            Category.user_id == current_user.id,
        )
    )
    if category is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Categoria não encontrada.",
        )
    return category


def get_user_subject_or_404(
    subject_id: int,
    current_user: User,
    db: Session,
) -> Subject:
    subject = db.scalar(
        select(Subject).where(
            Subject.id == subject_id,
            Subject.user_id == current_user.id,
        )
    )
    if subject is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Matéria não encontrada.",
        )
    return subject
