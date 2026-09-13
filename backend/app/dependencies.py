from datetime import datetime, timedelta, timezone
import secrets

from fastapi import Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models import AuthSession, User
from app.security import decode_access_token_payload


def get_token_payload(
    request: Request,
) -> dict[str, int | str | None]:
    token = request.cookies.get(
        settings.auth_cookie_name
    )

    if token is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuário não autenticado.",
        )

    if request.method.upper() in {
        "POST",
        "PUT",
        "PATCH",
        "DELETE",
    }:
        csrf_cookie = request.cookies.get(
            settings.csrf_cookie_name
        )
        csrf_header = request.headers.get(
            "x-csrf-token"
        )

        if (
            not csrf_cookie
            or not csrf_header
            or not secrets.compare_digest(
                csrf_cookie,
                csrf_header,
            )
        ):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Token CSRF inválido.",
            )

    payload = decode_access_token_payload(
        token
    )

    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Sessão inválida ou expirada.",
        )

    return payload


def get_current_user(
    payload: dict[str, int | str | None] = Depends(get_token_payload),
    db: Session = Depends(get_db),
) -> User:
    user = db.get(User, int(payload["user_id"]))
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuário não encontrado.",
        )

    session_key = payload.get("session_key")
    if session_key:
        auth_session = db.scalar(
            select(AuthSession).where(
                AuthSession.user_id == user.id,
                AuthSession.session_key == session_key,
            )
        )
        if auth_session is None or auth_session.revoked_at is not None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Sessão encerrada. Faça login novamente.",
            )

        now = datetime.now(timezone.utc)
        last_seen = auth_session.last_seen_at
        if last_seen is None or last_seen.tzinfo is None:
            last_seen = last_seen.replace(tzinfo=timezone.utc) if last_seen else None
        if last_seen is None or now - last_seen >= timedelta(minutes=5):
            auth_session.last_seen_at = now
            db.commit()

    return user


def get_current_session_key(
    payload: dict[str, int | str | None] = Depends(get_token_payload),
) -> str | None:
    value = payload.get("session_key")
    return str(value) if value else None
