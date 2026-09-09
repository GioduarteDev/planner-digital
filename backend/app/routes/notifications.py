import asyncio
import hashlib
import json
from datetime import datetime, timedelta, timezone
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from pywebpush import WebPushException, webpush
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import settings
from app.database import engine, get_db
from app.dependencies import get_current_user
from app.models import (
    Event,
    EventReminderDelivery,
    PushSubscription,
    Reminder,
    Task,
    User,
)

router = APIRouter(prefix="/notifications", tags=["Notifications"])
REMINDER_CHECK_SECONDS = 30


class PushKeys(BaseModel):
    p256dh: str
    auth: str


class PushSubscriptionCreate(BaseModel):
    endpoint: str
    keys: PushKeys


class PushUnsubscribeRequest(BaseModel):
    endpoint: str


def get_vapid_public_key() -> str:
    return settings.vapid_public_key.strip()


def get_vapid_private_key_path() -> str:
    return settings.vapid_private_key_path.strip()


def get_vapid_subject() -> str:
    return settings.vapid_subject.strip() or "mailto:planner@example.com"


def ensure_vapid_configured() -> None:
    public_key = get_vapid_public_key()
    private_key_path = get_vapid_private_key_path()
    if public_key == "" or private_key_path == "":
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Web Push ainda não foi configurado.",
        )
    if not Path(private_key_path).exists():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="A chave privada VAPID não foi encontrada.",
        )


def send_push(subscription: PushSubscription, payload: dict) -> str:
    private_key_path = get_vapid_private_key_path()
    if private_key_path == "" or not Path(private_key_path).exists():
        return "error"

    try:
        webpush(
            subscription_info={
                "endpoint": subscription.endpoint,
                "keys": {"p256dh": subscription.p256dh, "auth": subscription.auth},
            },
            data=json.dumps(payload, ensure_ascii=False),
            vapid_private_key=private_key_path,
            vapid_claims={"sub": get_vapid_subject()},
            ttl=60 * 60,
        )
        return "sent"
    except WebPushException as error:
        response = getattr(error, "response", None)
        status_code = getattr(response, "status_code", None)
        if status_code in {404, 410}:
            return "expired"
        print("Erro ao enviar Web Push:", error)
        return "error"


def describe_offset(minutes: int, *, noun: str = "Começa") -> str:
    if minutes == 0:
        return f"{noun} agora"
    if minutes < 60:
        return f"{noun} em {minutes} minutos"
    if minutes == 60:
        return f"{noun} em 1 hora"
    if minutes < 1440 and minutes % 60 == 0:
        return f"{noun} em {minutes // 60} horas"
    if minutes == 1440:
        return f"{noun} em 1 dia"
    if minutes % 1440 == 0:
        return f"{noun} em {minutes // 1440} dias"
    return "Lembrete do Planner Digital"


def event_signature(event: Event) -> str:
    raw = f"{event.id}|{event.starts_at.isoformat()}|{event.reminder_minutes}"
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


def build_legacy_event_body(event: Event) -> str:
    minutes = event.reminder_minutes or 0
    prefix = describe_offset(minutes, noun="Começa")
    return f"{prefix} · {event.description}" if event.description else prefix


def process_legacy_event_reminders(db: Session, now: datetime) -> None:
    events = db.scalars(
        select(Event)
        .where(
            Event.reminder_minutes.is_not(None),
            Event.starts_at >= now - timedelta(minutes=5),
            Event.starts_at <= now + timedelta(days=8),
        )
        .order_by(Event.starts_at, Event.id)
    ).all()

    for event in events:
        minutes = event.reminder_minutes
        if minutes is None:
            continue
        due_at = event.starts_at - timedelta(minutes=minutes)
        if due_at > now or event.starts_at < now - timedelta(minutes=5):
            continue

        signature = event_signature(event)
        already_sent = db.scalar(
            select(EventReminderDelivery.id).where(
                EventReminderDelivery.event_id == event.id,
                EventReminderDelivery.signature == signature,
            )
        )
        if already_sent is not None:
            continue

        subscriptions = db.scalars(
            select(PushSubscription).where(PushSubscription.user_id == event.user_id)
        ).all()
        if not subscriptions:
            continue

        payload = {
            "title": f"Planner Digital · {event.title}",
            "body": build_legacy_event_body(event),
            "url": "/calendar",
            "tag": f"event-{event.id}-{signature[:12]}",
        }
        sent_any = False
        for subscription in list(subscriptions):
            result = send_push(subscription, payload)
            if result == "sent":
                sent_any = True
            elif result == "expired":
                db.delete(subscription)

        if sent_any:
            db.add(EventReminderDelivery(event_id=event.id, signature=signature))
        db.commit()


def normalize_datetime(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def generic_reminder_target(
    reminder: Reminder,
    db: Session,
) -> tuple[datetime, str, str, str] | None:
    if reminder.event_id is not None:
        event = db.get(Event, reminder.event_id)
        if event is None or event.user_id != reminder.user_id:
            return None
        target_at = normalize_datetime(event.starts_at)
        body = describe_offset(reminder.minutes_before, noun="Começa")
        if event.description:
            body = f"{body} · {event.description}"
        return target_at, event.title, body, "/calendar"

    if reminder.task_id is not None:
        task = db.get(Task, reminder.task_id)
        if task is None or task.user_id != reminder.user_id or task.due_at is None:
            return None
        target_at = normalize_datetime(task.due_at)
        body = describe_offset(reminder.minutes_before, noun="Prazo")
        if task.description:
            body = f"{body} · {task.description}"
        return target_at, task.text, body, "/calendar"

    return None


def process_multiple_reminders(db: Session, now: datetime) -> None:
    reminders = db.scalars(
        select(Reminder)
        .where(Reminder.enabled.is_(True), Reminder.channel == "push")
        .order_by(Reminder.id)
    ).all()

    for reminder in reminders:
        target = generic_reminder_target(reminder, db)
        if target is None:
            continue

        target_at, title, body, url = target
        due_at = target_at - timedelta(minutes=reminder.minutes_before)
        if due_at > now:
            continue
        if target_at < now - timedelta(minutes=5):
            continue

        raw = f"{reminder.id}|{target_at.isoformat()}|{reminder.minutes_before}"
        signature = hashlib.sha256(raw.encode("utf-8")).hexdigest()
        if reminder.sent_for_signature == signature:
            continue

        subscriptions = db.scalars(
            select(PushSubscription).where(
                PushSubscription.user_id == reminder.user_id
            )
        ).all()
        if not subscriptions:
            continue

        payload = {
            "title": f"Planner Digital · {title}",
            "body": body,
            "url": url,
            "tag": f"reminder-{reminder.id}-{signature[:12]}",
        }
        sent_any = False
        for subscription in list(subscriptions):
            result = send_push(subscription, payload)
            if result == "sent":
                sent_any = True
            elif result == "expired":
                db.delete(subscription)

        if sent_any:
            reminder.sent_for_signature = signature
            reminder.sent_at = now
        db.commit()


def process_due_reminders() -> None:
    public_key = get_vapid_public_key()
    private_key_path = get_vapid_private_key_path()
    if (
        public_key == ""
        or private_key_path == ""
        or not Path(private_key_path).exists()
    ):
        return

    now = datetime.now(timezone.utc)
    with Session(engine) as db:
        # Compatibilidade com os eventos já criados pelo frontend atual.
        process_legacy_event_reminders(db, now)
        # Sistema novo: vários lembretes por evento ou tarefa.
        process_multiple_reminders(db, now)


async def reminder_worker() -> None:
    while True:
        try:
            await asyncio.to_thread(process_due_reminders)
        except Exception as error:
            print("Erro no worker de lembretes:", error)
        await asyncio.sleep(REMINDER_CHECK_SECONDS)


@router.get("/vapid-public-key")
def vapid_public_key():
    public_key = get_vapid_public_key()
    if public_key == "":
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Web Push ainda não foi configurado.",
        )
    return {"public_key": public_key}


@router.post("/subscribe", status_code=status.HTTP_201_CREATED)
def subscribe(
    payload: PushSubscriptionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if payload.endpoint.strip() == "":
        raise HTTPException(status_code=400, detail="Endpoint de push inválido.")

    existing = db.scalar(
        select(PushSubscription).where(PushSubscription.endpoint == payload.endpoint)
    )
    if existing is None:
        db.add(
            PushSubscription(
                user_id=current_user.id,
                endpoint=payload.endpoint,
                p256dh=payload.keys.p256dh,
                auth=payload.keys.auth,
            )
        )
    else:
        existing.user_id = current_user.id
        existing.p256dh = payload.keys.p256dh
        existing.auth = payload.keys.auth
    db.commit()
    return {"subscribed": True}


@router.delete("/subscribe", status_code=status.HTTP_204_NO_CONTENT)
def unsubscribe(
    payload: PushUnsubscribeRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    subscription = db.scalar(
        select(PushSubscription).where(
            PushSubscription.endpoint == payload.endpoint,
            PushSubscription.user_id == current_user.id,
        )
    )
    if subscription is not None:
        db.delete(subscription)
        db.commit()
    return None


@router.post("/test")
def test_push(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ensure_vapid_configured()
    subscriptions = db.scalars(
        select(PushSubscription).where(PushSubscription.user_id == current_user.id)
    ).all()
    if not subscriptions:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Nenhum dispositivo está inscrito para notificações.",
        )

    sent = 0
    payload = {
        "title": "Planner Digital 🔔",
        "body": "Notificação real funcionando!",
        "url": "/calendar",
        "tag": "planner-push-test",
    }
    for subscription in list(subscriptions):
        result = send_push(subscription, payload)
        if result == "sent":
            sent += 1
        elif result == "expired":
            db.delete(subscription)
    db.commit()

    if sent == 0:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Não foi possível entregar a notificação de teste.",
        )
    return {"sent": sent}
