from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy import text

from app import models  # noqa: F401
from app.database import engine
from app.routes.agendas import router as agendas_router
from app.routes.auth import router as auth_router
from app.routes.blocks import router as blocks_router
from app.routes.events import router as events_router
from app.routes.folders import router as folders_router
from app.routes.media import router as media_router
from app.routes.pages import router as pages_router
from app.routes.search import router as search_router
from app.routes.studies import router as studies_router
from app.routes.tasks import router as tasks_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    yield


app = FastAPI(
    title="Planner Digital API",
    version="1.0.0",
    lifespan=lifespan,
)


# CORS para desenvolvimento local:
# aceita localhost ou 127.0.0.1 em qualquer porta do Vite.
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=(
        r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$"
    ),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


UPLOADS_DIRECTORY = (
    Path(__file__).resolve().parents[1]
    / "uploads"
)

UPLOADS_DIRECTORY.mkdir(
    parents=True,
    exist_ok=True,
)

app.mount(
    "/uploads",
    StaticFiles(directory=UPLOADS_DIRECTORY),
    name="uploads",
)


app.include_router(auth_router)
app.include_router(agendas_router)
app.include_router(pages_router)
app.include_router(folders_router)
app.include_router(blocks_router)
app.include_router(media_router)
app.include_router(tasks_router)
app.include_router(events_router)
app.include_router(studies_router)
app.include_router(search_router)


@app.get("/")
def root():
    return {
        "message": "Planner Digital API funcionando!"
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
