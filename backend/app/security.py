from datetime import datetime, timedelta, timezone
from uuid import uuid4

import jwt
from jwt import InvalidTokenError
from pwdlib import PasswordHash

from app.config import settings

password_hash = PasswordHash.recommended()


def hash_password(password: str) -> str:
    return password_hash.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return password_hash.verify(plain_password, hashed_password)


def new_session_key() -> str:
    return uuid4().hex + uuid4().hex


def create_access_token(user_id: int, session_key: str | None = None) -> str:
    expires_at = datetime.now(timezone.utc) + timedelta(
        minutes=settings.jwt_expiration_minutes
    )
    payload: dict[str, object] = {
        "sub": str(user_id),
        "exp": expires_at,
        "kind": "access",
    }
    if session_key:
        payload["sid"] = session_key

    return jwt.encode(
        payload,
        settings.jwt_secret,
        algorithm=settings.jwt_algorithm,
    )


def decode_access_token_payload(token: str) -> dict[str, int | str | None] | None:
    try:
        payload = jwt.decode(
            token,
            settings.jwt_secret,
            algorithms=[settings.jwt_algorithm],
        )
        if payload.get("kind") not in (None, "access"):
            return None
        user_id = payload.get("sub")
        if user_id is None:
            return None
        return {
            "user_id": int(user_id),
            "session_key": payload.get("sid"),
        }
    except (InvalidTokenError, ValueError, TypeError):
        return None


def decode_access_token(token: str) -> int | None:
    payload = decode_access_token_payload(token)
    if payload is None:
        return None
    return int(payload["user_id"])
