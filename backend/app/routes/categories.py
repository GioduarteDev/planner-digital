from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models import Category, User
from app.schemas import CategoryCreate, CategoryResponse, CategoryUpdate

router = APIRouter(prefix="/categories", tags=["Categorias"])


def get_user_category(category_id: int, user_id: int, db: Session) -> Category | None:
    return db.scalar(
        select(Category).where(Category.id == category_id, Category.user_id == user_id)
    )


@router.get("", response_model=list[CategoryResponse])
def list_categories(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return db.scalars(
        select(Category)
        .where(Category.user_id == current_user.id)
        .order_by(Category.name, Category.id)
    ).all()


@router.post("", response_model=CategoryResponse, status_code=status.HTTP_201_CREATED)
def create_category(
    data: CategoryCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    category = Category(user_id=current_user.id, name=data.name, color=data.color)
    db.add(category)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Você já tem uma categoria com esse nome.")
    db.refresh(category)
    return category


@router.patch("/{category_id}", response_model=CategoryResponse)
def update_category(
    category_id: int,
    data: CategoryUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    category = get_user_category(category_id, current_user.id, db)
    if category is None:
        raise HTTPException(status_code=404, detail="Categoria não encontrada.")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(category, field, value)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Você já tem uma categoria com esse nome.")
    db.refresh(category)
    return category


@router.delete("/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_category(
    category_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    category = get_user_category(category_id, current_user.id, db)
    if category is None:
        raise HTTPException(status_code=404, detail="Categoria não encontrada.")
    db.delete(category)
    db.commit()
    return None
