import asyncio
from contextlib import asynccontextmanager, suppress
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
from app.routes.canvas import router as canvas_router
from app.routes.categories import router as categories_router
from app.routes.data_management import router as data_management_router
from app.routes.duplication import router as duplication_router
from app.routes.events import router as events_router
from app.routes.folders import router as folders_router
from app.routes.media import router as media_router
from app.routes.media_library import router as media_library_router
from app.routes.notifications import reminder_worker, router as notifications_router
from app.routes.page_templates import router as page_templates_router
from app.routes.pages import router as pages_router
from app.routes.presets import router as presets_router
from app.routes.profile import router as profile_router
from app.routes.projects import router as projects_router
from app.routes.reminders import router as reminders_router
from app.routes.search import router as search_router
from app.routes.stationery_kits import router as stationery_kits_router
from app.routes.studies import router as studies_router
from app.routes.subjects import router as subjects_router
from app.routes.tasks import router as tasks_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    reminder_task = asyncio.create_task(reminder_worker())
    try:
        yield
    finally:
        reminder_task.cancel()
        with suppress(asyncio.CancelledError):
            await reminder_task


app = FastAPI(
    title="Planner Digital API",
    version="1.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOADS_DIRECTORY = Path(__file__).resolve().parents[1] / "uploads"
UPLOADS_DIRECTORY.mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=UPLOADS_DIRECTORY), name="uploads")

app.include_router(auth_router)
app.include_router(profile_router)
app.include_router(agendas_router)
app.include_router(pages_router)
app.include_router(folders_router)
app.include_router(blocks_router)
app.include_router(media_router)
app.include_router(media_library_router)
app.include_router(canvas_router)
app.include_router(page_templates_router)
app.include_router(duplication_router)
app.include_router(projects_router)
app.include_router(categories_router)
app.include_router(tasks_router)
app.include_router(events_router)
app.include_router(reminders_router)
app.include_router(notifications_router)
app.include_router(subjects_router)
app.include_router(studies_router)
app.include_router(presets_router)
app.include_router(stationery_kits_router)
app.include_router(data_management_router)
app.include_router(search_router)


@app.get("/")
def root():
    return {"message": "Planner Digital API funcionando!"}


@app.get("/health")
def health_check():
    return {"status": "ok"}


@app.get("/db-health")
def database_health_check():
    with engine.connect() as connection:
        connection.execute(text("SELECT 1"))
    return {"database": "ok"}
