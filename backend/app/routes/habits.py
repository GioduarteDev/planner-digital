from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models import Habit, HabitCompletion, User
from app.schemas import (
    HabitCompletionResponse,
    HabitCreate,
    HabitResponse,
    HabitUpdate,
)

router = APIRouter(tags=["Hábitos"])


def get_user_habit(
    habit_id: int,
    user_id: int,
    db: Session,
) -> Habit | None:
    return db.scalar(
        select(Habit).where(
            Habit.id == habit_id,
            Habit.user_id == user_id,
        )
    )


@router.get("/habits", response_model=list[HabitResponse])
def list_habits(
    active: bool | None = Query(default=None),
    on_date: date | None = Query(default=None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = select(Habit).where(Habit.user_id == current_user.id)

    if active is not None:
        query = query.where(Habit.active == active)

    habits = db.scalars(
        query.order_by(
            Habit.created_at,
            Habit.id,
        )
    ).all()

    if on_date is not None:
        weekday = on_date.weekday()

        habits = [
            habit
            for habit in habits
            if habit.active and weekday in habit.days_of_week
        ]

    return habits


@router.get("/habits/{habit_id}", response_model=HabitResponse)
def get_habit(
    habit_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    habit = get_user_habit(habit_id, current_user.id, db)

    if habit is None:
        raise HTTPException(
            status_code=404,
            detail="Hábito não encontrado.",
        )

    return habit


@router.post(
    "/habits",
    response_model=HabitResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_habit(
    data: HabitCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    habit = Habit(
        user_id=current_user.id,
        name=data.name,
        description=data.description,
        days_of_week=data.days_of_week,
        time_of_day=data.time_of_day,
        color=data.color,
        active=True,
    )

    db.add(habit)
    db.commit()
    db.refresh(habit)

    return habit


@router.patch("/habits/{habit_id}", response_model=HabitResponse)
def update_habit(
    habit_id: int,
    data: HabitUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    habit = get_user_habit(habit_id, current_user.id, db)

    if habit is None:
        raise HTTPException(
            status_code=404,
            detail="Hábito não encontrado.",
        )

    updates = data.model_dump(exclude_unset=True)

    for field, value in updates.items():
        setattr(habit, field, value)

    db.commit()
    db.refresh(habit)

    return habit


@router.delete(
    "/habits/{habit_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_habit(
    habit_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    habit = get_user_habit(habit_id, current_user.id, db)

    if habit is None:
        raise HTTPException(
            status_code=404,
            detail="Hábito não encontrado.",
        )

    db.delete(habit)
    db.commit()

    return None


@router.get(
    "/habit-completions",
    response_model=list[HabitCompletionResponse],
)
def list_habit_completions(
    completion_date: date | None = Query(default=None),
    start: date | None = Query(default=None),
    end: date | None = Query(default=None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if start is not None and end is not None and end < start:
        raise HTTPException(
            status_code=400,
            detail="A data final não pode ser anterior à data inicial.",
        )

    query = (
        select(HabitCompletion)
        .join(Habit)
        .where(Habit.user_id == current_user.id)
    )

    if completion_date is not None:
        query = query.where(
            HabitCompletion.completion_date == completion_date
        )

    if start is not None:
        query = query.where(
            HabitCompletion.completion_date >= start
        )

    if end is not None:
        query = query.where(
            HabitCompletion.completion_date <= end
        )

    return db.scalars(
        query.order_by(
            HabitCompletion.completion_date.desc(),
            HabitCompletion.id,
        )
    ).all()


@router.put(
    "/habits/{habit_id}/completions/{completion_date}",
    response_model=HabitCompletionResponse,
)
def complete_habit(
    habit_id: int,
    completion_date: date,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    habit = get_user_habit(habit_id, current_user.id, db)

    if habit is None:
        raise HTTPException(
            status_code=404,
            detail="Hábito não encontrado.",
        )

    completion = db.scalar(
        select(HabitCompletion).where(
            HabitCompletion.habit_id == habit.id,
            HabitCompletion.completion_date == completion_date,
        )
    )

    if completion is not None:
        return completion

    completion = HabitCompletion(
        habit_id=habit.id,
        completion_date=completion_date,
    )

    db.add(completion)
    db.commit()
    db.refresh(completion)

    return completion


@router.delete(
    "/habits/{habit_id}/completions/{completion_date}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def uncomplete_habit(
    habit_id: int,
    completion_date: date,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    habit = get_user_habit(habit_id, current_user.id, db)

    if habit is None:
        raise HTTPException(
            status_code=404,
            detail="Hábito não encontrado.",
        )

    completion = db.scalar(
        select(HabitCompletion).where(
            HabitCompletion.habit_id == habit.id,
            HabitCompletion.completion_date == completion_date,
        )
    )

    if completion is not None:
        db.delete(completion)
        db.commit()

    return None