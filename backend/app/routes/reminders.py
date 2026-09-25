from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models import Event, Habit, Reminder, Task, User
from app.schemas import ReminderCreate, ReminderResponse, ReminderUpdate

router = APIRouter(prefix="/reminders", tags=["Lembretes"])


def get_user_reminder(
    reminder_id: int,
    user_id: int,
    db: Session,
) -> Reminder | None:
    return db.scalar(
        select(Reminder).where(
            Reminder.id == reminder_id,
            Reminder.user_id == user_id,
        )
    )


def validate_target(
    data: ReminderCreate,
    current_user: User,
    db: Session,
) -> None:
    if data.event_id is not None:
        event = db.scalar(
            select(Event).where(
                Event.id == data.event_id,
                Event.user_id == current_user.id,
            )
        )

        if event is None:
            raise HTTPException(
                status_code=404,
                detail="Evento não encontrado.",
            )

        return

    if data.task_id is not None:
        task = db.scalar(
            select(Task).where(
                Task.id == data.task_id,
                Task.user_id == current_user.id,
            )
        )

        if task is None:
            raise HTTPException(
                status_code=404,
                detail="Tarefa não encontrada.",
            )

        if task.due_at is None:
            raise HTTPException(
                status_code=409,
                detail=(
                    "Defina data e horário (due_at) na tarefa "
                    "antes de criar um lembrete."
                ),
            )

        return

    if data.habit_id is not None:
        habit = db.scalar(
            select(Habit).where(
                Habit.id == data.habit_id,
                Habit.user_id == current_user.id,
            )
        )

        if habit is None:
            raise HTTPException(
                status_code=404,
                detail="Hábito não encontrado.",
            )

        if habit.time_of_day is None:
            raise HTTPException(
                status_code=409,
                detail=(
                    "Defina um horário no hábito antes de criar "
                    "um lembrete."
                ),
            )

        return


@router.get("", response_model=list[ReminderResponse])
def list_reminders(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return db.scalars(
        select(Reminder)
        .where(Reminder.user_id == current_user.id)
        .order_by(
            Reminder.created_at.desc(),
            Reminder.id.desc(),
        )
    ).all()


@router.get(
    "/event/{event_id}",
    response_model=list[ReminderResponse],
)
def list_event_reminders(
    event_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    event = db.scalar(
        select(Event).where(
            Event.id == event_id,
            Event.user_id == current_user.id,
        )
    )

    if event is None:
        raise HTTPException(
            status_code=404,
            detail="Evento não encontrado.",
        )

    return db.scalars(
        select(Reminder)
        .where(
            Reminder.user_id == current_user.id,
            Reminder.event_id == event_id,
        )
        .order_by(
            Reminder.minutes_before.desc(),
            Reminder.id,
        )
    ).all()


@router.get(
    "/task/{task_id}",
    response_model=list[ReminderResponse],
)
def list_task_reminders(
    task_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    task = db.scalar(
        select(Task).where(
            Task.id == task_id,
            Task.user_id == current_user.id,
        )
    )

    if task is None:
        raise HTTPException(
            status_code=404,
            detail="Tarefa não encontrada.",
        )

    return db.scalars(
        select(Reminder)
        .where(
            Reminder.user_id == current_user.id,
            Reminder.task_id == task_id,
        )
        .order_by(
            Reminder.minutes_before.desc(),
            Reminder.id,
        )
    ).all()


@router.get(
    "/habit/{habit_id}",
    response_model=list[ReminderResponse],
)
def list_habit_reminders(
    habit_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    habit = db.scalar(
        select(Habit).where(
            Habit.id == habit_id,
            Habit.user_id == current_user.id,
        )
    )

    if habit is None:
        raise HTTPException(
            status_code=404,
            detail="Hábito não encontrado.",
        )

    return db.scalars(
        select(Reminder)
        .where(
            Reminder.user_id == current_user.id,
            Reminder.habit_id == habit_id,
        )
        .order_by(
            Reminder.minutes_before.desc(),
            Reminder.id,
        )
    ).all()


@router.post(
    "",
    response_model=ReminderResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_reminder(
    data: ReminderCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    validate_target(data, current_user, db)

    duplicate = db.scalar(
        select(Reminder).where(
            Reminder.user_id == current_user.id,
            (
                Reminder.event_id == data.event_id
                if data.event_id is not None
                else Reminder.event_id.is_(None)
            ),
            (
                Reminder.task_id == data.task_id
                if data.task_id is not None
                else Reminder.task_id.is_(None)
            ),
            (
                Reminder.habit_id == data.habit_id
                if data.habit_id is not None
                else Reminder.habit_id.is_(None)
            ),
            Reminder.minutes_before == data.minutes_before,
            Reminder.channel == data.channel,
        )
    )

    if duplicate is not None:
        raise HTTPException(
            status_code=409,
            detail="Este lembrete já existe.",
        )

    reminder = Reminder(
        user_id=current_user.id,
        event_id=data.event_id,
        task_id=data.task_id,
        habit_id=data.habit_id,
        minutes_before=data.minutes_before,
        channel=data.channel,
        enabled=data.enabled,
    )

    db.add(reminder)
    db.commit()
    db.refresh(reminder)

    return reminder


@router.patch(
    "/{reminder_id}",
    response_model=ReminderResponse,
)
def update_reminder(
    reminder_id: int,
    data: ReminderUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    reminder = get_user_reminder(
        reminder_id,
        current_user.id,
        db,
    )

    if reminder is None:
        raise HTTPException(
            status_code=404,
            detail="Lembrete não encontrado.",
        )

    for field, value in data.model_dump(
        exclude_unset=True
    ).items():
        setattr(reminder, field, value)

    # Alterar a antecedência cria uma nova programação.
    reminder.sent_for_signature = None
    reminder.sent_at = None

    db.commit()
    db.refresh(reminder)

    return reminder


@router.delete(
    "/{reminder_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_reminder(
    reminder_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    reminder = get_user_reminder(
        reminder_id,
        current_user.id,
        db,
    )

    if reminder is None:
        raise HTTPException(
            status_code=404,
            detail="Lembrete não encontrado.",
        )

    db.delete(reminder)
    db.commit()

    return None