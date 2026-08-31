from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from app import models
from app.database import engine

from app.routes.agendas import (
    router as agendas_router,
)

from app.routes.pages import (
    router as pages_router,
)

from app.routes.tasks import (
    router as tasks_router,
)
from app.routes.auth import (
    router as auth_router,
)
from app.routes.events import (
    router as events_router,
)

from app.routes.studies import (
    router as studies_router,
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    yield


app = FastAPI(
    title="Planner Digital API",
    version="1.0.0",
    lifespan=lifespan,
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(
    agendas_router
)

app.include_router(
    pages_router
)

app.include_router(
    tasks_router
)
app.include_router(
    auth_router
)
app.include_router(
    events_router
)

app.include_router(
    studies_router
)


@app.get("/")
def root():
    return {
        "message": (
            "Planner Digital API funcionando!"
        )
    }


@app.get("/health")
def health_check():
    return {
        "status": "ok"
    }


@app.get("/db-health")
def database_health_check():
    with engine.connect() as connection:
        connection.execute(
            text("SELECT 1")
        )

    return {
        "database": "ok"
    }