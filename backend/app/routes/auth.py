from datetime import datetime, timezone
import secrets

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy import func, select, update
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.dependencies import get_current_session_key, get_current_user
from app.models import Agenda, AuthSession, User
from app.schemas import (
    AuthSessionResponse,
    LoginRequest,
    AuthResponse,
    UserCreate,
    UserResponse,
)
from app.security import (
    create_access_token,
    hash_password,
    new_session_key,
    verify_password,
)

router = APIRouter(prefix="/auth", tags=["Autenticação"])



def _set_auth_cookies(
    response: Response,
    token: str,
) -> None:
    csrf_token = secrets.token_urlsafe(32)
    max_age = settings.jwt_expiration_minutes * 60

    response.set_cookie(
        key=settings.auth_cookie_name,
        value=token,
        max_age=max_age,
        httponly=True,
        secure=settings.cookie_secure,
        samesite=settings.cookie_samesite,
        path="/",
    )

    response.set_cookie(
        key=settings.csrf_cookie_name,
        value=csrf_token,
        max_age=max_age,
        httponly=False,
        secure=settings.cookie_secure,
        samesite=settings.cookie_samesite,
        path="/",
    )


def _clear_auth_cookies(
    response: Response,
) -> None:
    response.delete_cookie(
        key=settings.auth_cookie_name,
        path="/",
        secure=settings.cookie_secure,
        httponly=True,
        samesite=settings.cookie_samesite,
    )

    response.delete_cookie(
        key=settings.csrf_cookie_name,
        path="/",
        secure=settings.cookie_secure,
        httponly=False,
        samesite=settings.cookie_samesite,
    )

def _request_ip(request: Request) -> str | None:
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",", 1)[0].strip()[:64]
    if request.client:
        return str(request.client.host)[:64]
    return None


def _create_session(user: User, request: Request, db: Session) -> AuthSession:
    session = AuthSession(
        user_id=user.id,
        session_key=new_session_key(),
        user_agent=(request.headers.get("user-agent") or "")[:500] or None,
        ip_address=_request_ip(request),
    )
    db.add(session)
    db.flush()
    return session


def _session_response(item: AuthSession, current_key: str | None) -> AuthSessionResponse:
    return AuthSessionResponse(
        id=item.id,
        user_agent=item.user_agent,
        ip_address=item.ip_address,
        created_at=item.created_at,
        last_seen_at=item.last_seen_at,
        revoked_at=item.revoked_at,
        active=item.revoked_at is None,
        current=(current_key is not None and item.session_key == current_key),
    )


@router.post("/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
def register(data: UserCreate, request: Request, response: Response, db: Session = Depends(get_db)):
    existing_user = db.scalar(select(User).where(User.email == data.email))
    if existing_user:
        raise HTTPException(status_code=400, detail="Já existe uma conta com este e-mail.")

    if data.username is not None:
        existing_username = db.scalar(select(User).where(User.username == data.username))
        if existing_username:
            raise HTTPException(status_code=409, detail="Este username já está em uso.")

    user_count = db.scalar(select(func.count()).select_from(User))
    is_first_user = user_count == 0

    user = User(
        email=data.email,
        password_hash=hash_password(data.password),
        name=data.name,
        username=data.username,
    )
    db.add(user)
    db.flush()

    if is_first_user:
        db.execute(update(Agenda).where(Agenda.user_id.is_(None)).values(user_id=user.id))

    auth_session = _create_session(user, request, db)
    db.commit()
    db.refresh(user)

    token = create_access_token(user.id, auth_session.session_key)
    _set_auth_cookies(response, token)
    return {"user": user}


@router.post("/login", response_model=AuthResponse)
def login(data: LoginRequest, request: Request, response: Response, db: Session = Depends(get_db)):
    user = db.scalar(select(User).where(User.email == data.email))
    if user is None or not verify_password(data.password, user.password_hash):
        raise HTTPException(status_code=401, detail="E-mail ou senha incorretos.")

    auth_session = _create_session(user, request, db)
    db.commit()
    db.refresh(user)

    token = create_access_token(user.id, auth_session.session_key)
    _set_auth_cookies(response, token)
    return {"user": user}


@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user


@router.get("/sessions", response_model=list[AuthSessionResponse])
def list_sessions(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    current_key: str | None = Depends(get_current_session_key),
):
    items = db.scalars(
        select(AuthSession)
        .where(AuthSession.user_id == current_user.id)
        .order_by(AuthSession.created_at.desc(), AuthSession.id.desc())
    ).all()
    return [_session_response(item, current_key) for item in items]


@router.delete("/sessions/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
def revoke_session(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    item = db.scalar(
        select(AuthSession).where(
            AuthSession.id == session_id,
            AuthSession.user_id == current_user.id,
        )
    )
    if item is None:
        raise HTTPException(status_code=404, detail="Sessão não encontrada.")

    if item.revoked_at is None:
        item.revoked_at = datetime.now(timezone.utc)
        db.commit()
    return None


@router.post("/sessions/revoke-others", status_code=status.HTTP_204_NO_CONTENT)
def revoke_other_sessions(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    current_key: str | None = Depends(get_current_session_key),
):
    now = datetime.now(timezone.utc)
    items = db.scalars(
        select(AuthSession).where(
            AuthSession.user_id == current_user.id,
            AuthSession.revoked_at.is_(None),
        )
    ).all()
    for item in items:
        if current_key is None or item.session_key != current_key:
            item.revoked_at = now
    db.commit()
    return None


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(
    response: Response,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    current_key: str | None = Depends(get_current_session_key),
):
    # Tokens antigos, criados antes do controle de sessões, continuam válidos
    # até expirarem. Novos logins possuem sid e podem ser encerrados de verdade.
    if current_key:
        item = db.scalar(
            select(AuthSession).where(
                AuthSession.user_id == current_user.id,
                AuthSession.session_key == current_key,
            )
        )
        if item is not None and item.revoked_at is None:
            item.revoked_at = datetime.now(timezone.utc)
            db.commit()

    _clear_auth_cookies(response)
    return None
