from datetime import datetime, timedelta, timezone

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import AuthSession, User
from app.security import decode_access_token_payload

bearer_scheme = HTTPBearer(auto_error=False)


def get_token_payload(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> dict[str, int | str | None]:
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuário não autenticado.",
        )

    payload = decode_access_token_payload(credentials.credentials)
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido ou expirado.",
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
