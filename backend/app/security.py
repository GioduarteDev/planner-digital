from datetime import (
    datetime,
    timedelta,
    timezone,
)

import jwt

from jwt import InvalidTokenError
from pwdlib import PasswordHash

from app.config import settings


password_hash = (
    PasswordHash.recommended()
)


def hash_password(
    password: str,
) -> str:
    return password_hash.hash(
        password
    )


def verify_password(
    plain_password: str,
    hashed_password: str,
) -> bool:
    return password_hash.verify(
        plain_password,
        hashed_password,
    )


def create_access_token(
    user_id: int,
) -> str:
    expires_at = (
        datetime.now(
            timezone.utc
        )
        + timedelta(
            minutes=(
                settings
                .jwt_expiration_minutes
            )
        )
    )

    payload = {
        "sub": str(user_id),
        "exp": expires_at,
    }

    return jwt.encode(
        payload,
        settings.jwt_secret,
        algorithm=(
            settings.jwt_algorithm
        ),
    )


def decode_access_token(
    token: str,
) -> int | None:
    try:
        payload = jwt.decode(
            token,
            settings.jwt_secret,
            algorithms=[
                settings.jwt_algorithm
            ],
        )

        user_id = payload.get(
            "sub"
        )

        if user_id is None:
            return None

        return int(user_id)

    except (
        InvalidTokenError,
        ValueError,
    ):
        return None