import asyncio
from contextlib import asynccontextmanager, suppress

from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from app import models  # noqa: F401
from app.config import settings
from app.database import engine
from app.routes.agendas import router as agendas_router
from app.routes.auth import router as auth_router
from app.routes.blocks import router as blocks_router
from app.routes.canvas import router as canvas_router
from app.routes.categories import router as categories_router
from app.routes.data_management import router as data_management_router
from app.routes.daily_entries import router as daily_entries_router
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
from app.routes.private_uploads import router as private_uploads_router
from app.routes.projects import router as projects_router
from app.routes.reminders import router as reminders_router
from app.routes.search import router as search_router
from app.routes.stationery_kits import router as stationery_kits_router
from app.routes.studies import router as studies_router
from app.routes.subjects import router as subjects_router
from app.routes.tasks import router as tasks_router
from app.routes.habits import router as habits_router
from app.routes.inbox import router as inbox_router
from app.routes.weekly_reviews import router as weekly_reviews_router
from pathlib import Path
from fastapi.responses import FileResponse

@asynccontextmanager
async def lifespan(app: FastAPI):
    reminder_task = asyncio.create_task(reminder_worker())
    try:
        yield
    finally:
        reminder_task.cancel()
        with suppress(asyncio.CancelledError):
            await reminder_task


is_production = (
    settings.app_env == "production"
)


app = FastAPI(
    title="Planner Digital API",
    version="1.1.0",
    lifespan=lifespan,
    docs_url=None if is_production else "/docs",
    redoc_url=None if is_production else "/redoc",
    openapi_url=None if is_production else "/openapi.json",
)

cors_common = {
    "allow_credentials": True,
    "allow_methods": [
        "GET",
        "POST",
        "PUT",
        "PATCH",
        "DELETE",
        "OPTIONS",
    ],
    "allow_headers": [
        "Accept",
        "Content-Type",
        "X-CSRF-Token",
    ],
    "expose_headers": [
        "Retry-After",
        "Content-Disposition",
    ],
}


if is_production:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origin_list,
        **cors_common,
    )
else:
    app.add_middleware(
        CORSMiddleware,
        allow_origin_regex=(
            r"^https?://"
            r"(localhost|127\.0\.0\.1)"
            r"(:\d+)?$"
        ),
        **cors_common,
    )


@app.middleware("http")
async def add_security_headers(
    request: Request,
    call_next,
):
    response = await call_next(request)

    response.headers[
        "X-Content-Type-Options"
    ] = "nosniff"

    response.headers[
        "X-Frame-Options"
    ] = "DENY"

    response.headers[
        "Referrer-Policy"
    ] = "no-referrer"

    response.headers[
        "Permissions-Policy"
    ] = (
        "camera=(), "
        "microphone=(), "
        "geolocation=()"
    )

    if is_production:
        response.headers[
            "Strict-Transport-Security"
        ] = (
            "max-age=31536000; "
            "includeSubDomains"
        )
    response.headers[
            "Content-Security-Policy"
        ] = (
            "default-src 'self'; "
            "script-src 'self'; "
            "style-src 'self' 'unsafe-inline'; "
            "img-src 'self' https: data: blob:; "
            "font-src 'self' data:; "
            "connect-src 'self'; "
            "media-src 'self' blob:; "
            "worker-src 'self' blob:; "
            "object-src 'none'; "
            "frame-ancestors 'none'; "
            "base-uri 'none'"
        )

    return response

app.include_router(auth_router)
app.include_router(profile_router)
app.include_router(private_uploads_router)
app.include_router(agendas_router)
app.include_router(pages_router)
app.include_router(folders_router)
app.include_router(blocks_router)
app.include_router(tasks_router)
app.include_router(media_router)
app.include_router(media_library_router)
app.include_router(canvas_router)
app.include_router(page_templates_router)
app.include_router(duplication_router)
app.include_router(projects_router)
app.include_router(categories_router)
app.include_router(habits_router)
app.include_router(events_router)
app.include_router(reminders_router)
app.include_router(notifications_router)
app.include_router(subjects_router)
app.include_router(inbox_router)
app.include_router(weekly_reviews_router)
app.include_router(studies_router)
app.include_router(presets_router)
app.include_router(stationery_kits_router)
app.include_router(data_management_router)
app.include_router(daily_entries_router)
app.include_router(search_router)


FRONTEND_DIST = (
    Path(__file__).resolve().parents[2]
    / "frontend"
    / "dist"
)


@app.get("/")
def root():
    if is_production:
        return FileResponse(
            FRONTEND_DIST / "index.html"
        )

    return {
        "message": "Planner Digital API funcionando!"
    }


@app.get("/health")
def health_check():
    return {"status": "ok"}


if not is_production:
    @app.get("/db-health")
    def database_health_check():
        with engine.connect() as connection:
            connection.execute(
                text("SELECT 1")
            )
        return {"database":"ok"}  

if is_production:

    @app.get("/{full_path:path}", include_in_schema=False)
    def serve_frontend(full_path: str, request: Request):
        static_root = FRONTEND_DIST.resolve()
        file_path = (static_root / full_path).resolve()

        if not file_path.is_relative_to(static_root):
            raise HTTPException(status_code=404)

        if file_path.is_file():
            return FileResponse(file_path)

        if (
            "text/html" in request.headers.get("accept", "")
            and not Path(full_path).suffix
        ):
            return FileResponse(
                static_root / "index.html"
            )

        raise HTTPException(status_code=404)
