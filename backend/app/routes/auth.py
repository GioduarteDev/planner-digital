from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select, update
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models import Agenda, User
from app.schemas import LoginRequest, TokenResponse, UserCreate, UserResponse
from app.security import create_access_token, hash_password, verify_password

router = APIRouter(prefix="/auth", tags=["Autenticação"])


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def register(data: UserCreate, db: Session = Depends(get_db)):
    existing_user = db.scalar(select(User).where(User.email == data.email))
    if existing_user:
        raise HTTPException(status_code=400, detail="Já existe uma conta com este e-mail.")

    if data.username is not None:
        existing_username = db.scalar(
            select(User).where(User.username == data.username)
        )
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

    # Compatibilidade com a fase inicial do projeto, quando agendas podiam
    # existir antes da tabela users.
    if is_first_user:
        db.execute(
            update(Agenda)
            .where(Agenda.user_id.is_(None))
            .values(user_id=user.id)
        )

    db.commit()
    db.refresh(user)
    token = create_access_token(user.id)
    return {"access_token": token, "token_type": "bearer", "user": user}


@router.post("/login", response_model=TokenResponse)
def login(data: LoginRequest, db: Session = Depends(get_db)):
    user = db.scalar(select(User).where(User.email == data.email))
    if user is None or not verify_password(data.password, user.password_hash):
        raise HTTPException(status_code=401, detail="E-mail ou senha incorretos.")
    token = create_access_token(user.id)
    return {"access_token": token, "token_type": "bearer", "user": user}


@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user
