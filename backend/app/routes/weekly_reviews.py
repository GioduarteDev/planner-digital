from datetime import date

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, func
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models import User, WeeklyReview
from app.schemas import WeeklyReviewResponse, WeeklyReviewSave

router = APIRouter(prefix="/weekly-reviews", tags=["Revisão semanal"])


def validate_week(week_start: date):
    if week_start.weekday() != 0:
        raise HTTPException(status_code=422, detail="A semana deve começar na segunda-feira.")


@router.get("/{week_start}", response_model=WeeklyReviewResponse)
def get_review(week_start: date, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    validate_week(week_start)
    review = db.scalar(select(WeeklyReview).where(
        WeeklyReview.user_id == current_user.id, WeeklyReview.week_start == week_start,
    ))
    return review or WeeklyReviewResponse(week_start=week_start)


@router.put("/{week_start}", response_model=WeeklyReviewResponse)
def save_review(week_start: date, data: WeeklyReviewSave, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    validate_week(week_start)
    values = data.model_dump()
    # A database upsert also handles two tabs saving a previously empty week.
    statement = insert(WeeklyReview).values(user_id=current_user.id, week_start=week_start, **values)
    statement = statement.on_conflict_do_update(
        constraint="uq_weekly_reviews_user_week", set_={**values, "updated_at": func.now()},
    ).returning(WeeklyReview)
    review = db.scalar(statement)
    db.commit()
    db.refresh(review)
    return review
