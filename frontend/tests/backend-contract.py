"""Exercise the real FastAPI routes against an isolated temporary SQLite database.

Run: backend/.venv/Scripts/python.exe frontend/tests/backend-contract.py
No existing PostgreSQL database, account, or uploaded file is touched.
"""

from __future__ import annotations

import http.cookiejar
from contextlib import nullcontext
import json
import socket
import sys
import threading
import time
import urllib.error
import urllib.parse
import urllib.request
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from uuid import uuid4

from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
import uvicorn


ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "backend"))

from app.database import Base, get_db  # noqa: E402
from app.main import app  # noqa: E402
from app import models  # noqa: E402,F401
from app.config import settings  # noqa: E402
from app.routes import media_library  # noqa: E402


def expect(condition: bool, message: str) -> None:
    if not condition:
        raise AssertionError(message)


TEST_OUTPUT = ROOT / "frontend" / "test-results"
TEST_OUTPUT.mkdir(exist_ok=True)
with nullcontext():
    temporary_path = TEST_OUTPUT
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    @event.listens_for(engine, "connect")
    def enable_sqlite_foreign_keys(dbapi_connection, _connection_record):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()
    Base.metadata.create_all(engine)
    sessions = sessionmaker(bind=engine, autoflush=False, autocommit=False)

    def isolated_db():
        db = sessions()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = isolated_db
    media_library.LIBRARY_DIRECTORY = temporary_path / f"contract-media-{uuid4().hex}"
    media_library.LIBRARY_DIRECTORY.mkdir()

    listener = socket.socket()
    listener.bind(("127.0.0.1", 0))
    listener.listen(5)
    port = listener.getsockname()[1]
    server = uvicorn.Server(uvicorn.Config(app, log_level="error", lifespan="off"))
    thread = threading.Thread(target=server.run, kwargs={"sockets": [listener]}, daemon=True)
    thread.start()

    try:
        for _ in range(100):
            if server.started:
                break
            time.sleep(0.05)
        expect(server.started, "Temporary API did not start")

        jar = http.cookiejar.CookieJar()
        opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(jar))
        origin = f"http://127.0.0.1:{port}"

        def request(method: str, path: str, body=None, expected=200, multipart=False, *, client_opener=None, client_jar=None):
            active_opener = client_opener or opener
            active_jar = client_jar or jar
            headers = {"Accept": "application/json"}
            payload = None
            if body is not None:
                if multipart:
                    boundary = "matcha-contract-boundary"
                    headers["Content-Type"] = f"multipart/form-data; boundary={boundary}"
                    payload = body
                else:
                    headers["Content-Type"] = "application/json"
                    payload = json.dumps(body).encode("utf-8")
            if method in {"POST", "PUT", "PATCH", "DELETE"}:
                csrf = next((cookie.value for cookie in active_jar if cookie.name == settings.csrf_cookie_name), None)
                if csrf:
                    headers["X-CSRF-Token"] = csrf
            req = urllib.request.Request(origin + path, data=payload, headers=headers, method=method)
            try:
                with active_opener.open(req, timeout=10) as response:
                    raw = response.read()
                    expect(response.status == expected, f"{method} {path}: expected {expected}, got {response.status}")
                    return json.loads(raw) if raw else None
            except urllib.error.HTTPError as exc:
                detail = exc.read().decode("utf-8", errors="replace")
                if exc.code == expected:
                    return json.loads(detail) if detail else None
                raise AssertionError(f"{method} {path}: HTTP {exc.code}: {detail[:500]}") from exc

        request("POST", "/auth/register", {
            "email": f"matcha-contract-{uuid4().hex}@example.test",
            "password": "Test-only-passphrase-2026", "name": "Giovanna Teste",
        }, expected=201)
        profile = request("GET", "/profile")
        expect(profile["name"] == "Giovanna Teste", "Profile did not return registered name")

        agenda = request("POST", "/agendas", {"title": "Agenda de teste"}, expected=201)
        agenda_id = agenda["id"]
        pages = request("GET", f"/agendas/{agenda_id}/pages")
        expect(len(pages) == 5, "New agenda did not contain five pages")
        page_id = pages[0]["id"]

        tab = {"id": "tab-test", "label": "Estudos", "color": "#E6E3F7", "target": f"page:{page_id}", "order": 0}
        request("PATCH", f"/agendas/{agenda_id}", {"settings": {"page_tabs_v1": [tab]}})
        expect(request("GET", f"/agendas/{agenda_id}")["settings"]["page_tabs_v1"] == [tab], "Page tabs were not persisted")

        def canvas(element_type: str, data: dict, target_page_id=page_id, *, width=300, height=220, z_index=2, locked=False):
            return request("POST", "/canvas/elements", {
                "surface_type": "page", "page_id": target_page_id,
                "element_type": element_type, "x": 30, "y": 100,
                "width": width, "height": height, "rotation": 0,
                "z_index": z_index, "locked": locked, "data": data,
            }, expected=201)

        text = canvas("text", {"text": "Escrita livre", "fontSize": 18})
        study_widget = canvas("section:study-planner", {"goal": "Coreano"})
        request("PATCH", f"/canvas/elements/{study_widget['id']}", {"x": 70, "width": 420, "locked": True})
        study_copy = request("POST", f"/canvas/elements/{study_widget['id']}/duplicate", expected=201)
        expect(study_copy["id"] != study_widget["id"] and study_copy["data"]["goal"] == "Coreano", "Canvas duplicate failed")
        request("DELETE", f"/canvas/elements/{study_copy['id']}", expected=204)
        elements = request("GET", f"/canvas/elements?surface_type=page&page_id={page_id}")
        expect(any(item["id"] == text["id"] and item["data"]["text"] == "Escrita livre" for item in elements), "Free text did not round-trip")
        expect(any(item["id"] == study_widget["id"] and item["x"] == 70 and item["width"] == 420 and item["locked"] for item in elements), "Study widget geometry/lock did not persist")

        task = request("POST", f"/pages/{page_id}/tasks", {"text": "Revisar vocabulário", "due_date": date.today().isoformat()}, expected=201)
        receipt = canvas("widget:task-receipt", {"taskIds": [task["id"]]})
        request("PATCH", f"/tasks/{task['id']}", {"done": True})
        expect(any(item["id"] == task["id"] and item["done"] for item in request("GET", "/tasks")), "Receipt task PATCH did not persist")
        request("DELETE", f"/canvas/elements/{receipt['id']}", expected=204)
        expect(any(item["id"] == task["id"] for item in request("GET", "/tasks")), "Removing receipt also removed task")

        daily = request("POST", f"/agendas/{agenda_id}/pages", {"title": "Daily Study Focus", "paper_type": "grid", "paper_settings": {"orientation": "portrait"}}, expected=201)
        habits = canvas("section:habit-tracker", {"habits": [{"name": "Read", "days": [True, False, False, False, False, False, False]}]}, daily["id"])
        template = canvas("template:daily-study-focus", {"templateId": "daily-study-focus"}, daily["id"], width=886, height=1253, z_index=-20, locked=True)
        expect(daily["paper_type"] == "grid" and daily["paper_settings"]["orientation"] == "portrait", "Template page paper settings were lost")
        template_elements = request("GET", f"/canvas/elements?surface_type=page&page_id={daily['id']}")
        expect(any(item["id"] == template["id"] and item["locked"] and item["z_index"] == -20 for item in template_elements), "Fixed template base did not persist")
        expect(any(item["id"] == habits["id"] and item["data"]["habits"][0]["days"][0] for item in template_elements), "Section template data did not persist")

        roadmap_left = request("POST", f"/agendas/{agenda_id}/pages", {"title": "Open Planner Roadmap · Plano", "paper_type": "dotted", "paper_settings": {"orientation": "portrait"}}, expected=201)
        roadmap_right = request("POST", f"/agendas/{agenda_id}/pages", {"title": "Open Planner Roadmap · Reflexão", "paper_type": "dotted", "paper_settings": {"orientation": "portrait"}}, expected=201)
        left_base = canvas("template:roadmap-blue", {"templateId": "roadmap-blue", "spreadSide": "left"}, roadmap_left["id"], width=886, height=1253, z_index=-20, locked=True)
        right_base = canvas("template:roadmap-blue", {"templateId": "roadmap-blue", "spreadSide": "right"}, roadmap_right["id"], width=886, height=1253, z_index=-20, locked=True)
        expect(request("GET", f"/canvas/elements?surface_type=page&page_id={roadmap_left['id']}")[0]["data"]["spreadSide"] == "left", "Roadmap left side did not persist")
        expect(request("GET", f"/canvas/elements?surface_type=page&page_id={roadmap_right['id']}")[0]["data"]["spreadSide"] == "right", "Roadmap right side did not persist")
        expect(left_base["locked"] and right_base["locked"], "Roadmap spread bases must stay locked")

        request("PATCH", "/profile/settings", {"settings": {"matcha_profile": {"favoriteColor": "#9CA362"}}})
        today_key = date.today().isoformat()
        tomorrow_key = (date.today() + timedelta(days=1)).isoformat()
        request("PATCH", "/profile/settings", {"settings": {"today_v2": {today_key: {"mood": "calm", "note": "Dia de teste"}}}})
        request("PATCH", "/profile/settings", {"settings": {"today_v2": {tomorrow_key: {"mood": "focused"}}, "matcha_profile": {"city": "Campinas"}}})
        settings_after = request("GET", "/profile")["settings"]
        expect(settings_after["matcha_profile"]["favoriteColor"] == "#9CA362", "Today settings overwrote existing profile settings")
        expect(settings_after["matcha_profile"]["city"] == "Campinas", "Nested profile settings did not merge")
        expect(settings_after["today_v2"][today_key]["note"] == "Dia de teste", "Nested Today history was overwritten")
        expect(settings_after["today_v2"][tomorrow_key]["mood"] == "focused", "Second Today setting did not persist")

        event_start = datetime.now(timezone.utc) + timedelta(days=1)
        request("POST", "/events", {"title": "Consulta", "starts_at": event_start.isoformat()}, expected=201)
        request("POST", "/studies", {"subject": "Coreano", "study_date": date.today().isoformat(), "duration_minutes": 45}, expected=201)
        expect(len(request("GET", "/events")) >= 1, "Events API returned no event")
        range_start = (event_start - timedelta(hours=1)).isoformat()
        range_end = (event_start + timedelta(hours=1)).isoformat()
        event_query = urllib.parse.urlencode({"start": range_start, "end": range_end})
        expect(len(request("GET", f"/events?{event_query}")) == 1, "Event date range filter failed")
        expect(any(item["id"] == task["id"] for item in request("GET", f"/tasks?due_from={today_key}&due_to={today_key}&done=true")), "Task date/status filter failed")
        expect(any(item["duration_minutes"] == 45 for item in request("GET", "/studies")), "Studies API returned no study")

        png = bytes.fromhex("89504e470d0a1a0a0000000d4948445200000001000000010804000000b51c0c020000000b4944415478da63fcff1f0003030200efa345990000000049454e44ae426082")
        boundary = "matcha-contract-boundary"
        multipart_body = (
            f"--{boundary}\r\nContent-Disposition: form-data; name=\"media_type\"\r\n\r\nimage\r\n"
            f"--{boundary}\r\nContent-Disposition: form-data; name=\"file\"; filename=\"today.png\"\r\nContent-Type: image/png\r\n\r\n"
        ).encode() + png + f"\r\n--{boundary}--\r\n".encode()
        uploaded = request("POST", "/library/media", multipart_body, expected=201, multipart=True)
        expect(uploaded["media_type"] == "image" and any(item["id"] == uploaded["id"] for item in request("GET", "/library/media")), "Personal photo upload did not persist")

        daily_entry = request("PUT", f"/daily-entries/{today_key}", {
            "mood": "calm", "quick_note": "Um dia tranquilo",
            "music_data": {"title": "Soft morning", "artist": "Matcha"},
            "reading_data": {"title": "Livro"},
            "watching_data": {"title": "Série", "type": "series"},
            "photo_media_id": uploaded["id"],
        })
        expect(daily_entry["entry_date"] == today_key and daily_entry["photo_media_id"] == uploaded["id"], "Daily entry upsert failed")
        same_daily_entry = request("PUT", f"/daily-entries/{today_key}", {"mood": "focused", "quick_note": "Mesmo registro"})
        expect(same_daily_entry["id"] == daily_entry["id"], "Daily entry upsert created a duplicate date")
        updated_entry = request("PATCH", f"/daily-entries/{today_key}", {"quick_note": "Nota atualizada"})
        expect(updated_entry["quick_note"] == "Nota atualizada" and updated_entry["mood"] == "focused", "Daily entry PATCH replaced unrelated fields")
        request("PATCH", f"/daily-entries/{today_key}", {"quick_note": None}, expected=422)
        expect(len(request("GET", f"/daily-entries?start={today_key}&end={today_key}")) == 1, "Daily entry date query failed")

        folder = request("POST", f"/agendas/{agenda_id}/folders", {"title": "Estudos"}, expected=201)
        folder = request("PATCH", f"/folders/{folder['id']}", {"title": "Estudos focados"})
        moved_page = pages[1]
        request("PATCH", f"/pages/{moved_page['id']}/folder", {"folder_id": folder["id"]})
        request("PATCH", f"/agendas/{agenda_id}/folders/reorder", {"folder_ids": [folder["id"]]})
        expect(request("GET", f"/pages/{moved_page['id']}")["folder_id"] == folder["id"], "Section assignment did not persist")
        tabs = [
            {"id": "tab-page", "label": "Hoje", "color": "#E6E3F7", "target": f"page:{page_id}", "order": 0},
            {"id": "tab-folder", "label": "Estudos", "color": "#9CA362", "target": f"section:{folder['id']}", "order": 1},
        ]
        request("PATCH", f"/agendas/{agenda_id}", {"settings": {"page_tabs_v1": tabs}})
        duplicate_receipt = canvas("widget:task-receipt", {"taskIds": [task["id"]]})
        duplicated_page = request("POST", f"/pages/{page_id}/duplicate", expected=201)
        duplicated_tasks = request("GET", f"/pages/{duplicated_page['id']}/tasks")
        duplicated_elements = request("GET", f"/canvas/elements?surface_type=page&page_id={duplicated_page['id']}")
        duplicated_receipts = [item for item in duplicated_elements if item["element_type"] == "widget:task-receipt"]
        expect(len(duplicated_tasks) == 1 and duplicated_tasks[0]["id"] != task["id"], "Page duplication did not create new task IDs")
        expect(duplicated_receipts and duplicated_receipts[0]["data"]["taskIds"] == [duplicated_tasks[0]["id"]], "Page duplication did not remap Task Receipt")
        expect(any(item["id"] != text["id"] and item["data"].get("text") == "Escrita livre" for item in duplicated_elements), "Page duplication reused or lost canvas content")

        duplicated_agenda = request("POST", f"/agendas/{agenda_id}/duplicate", expected=201)
        duplicated_agenda_pages = request("GET", f"/agendas/{duplicated_agenda['id']}/pages")
        duplicated_folders = request("GET", f"/agendas/{duplicated_agenda['id']}/folders")
        duplicated_tabs = request("GET", f"/agendas/{duplicated_agenda['id']}")["settings"]["page_tabs_v1"]
        copied_page_ids = {item["id"] for item in duplicated_agenda_pages}
        copied_folder_ids = {item["id"] for item in duplicated_folders}
        expect(int(duplicated_tabs[0]["target"].split(":")[1]) in copied_page_ids, "Agenda duplication kept an original page tab target")
        expect(int(duplicated_tabs[1]["target"].split(":")[1]) in copied_folder_ids, "Agenda duplication kept an original section tab target")

        request("DELETE", f"/pages/{page_id}", expected=204)
        tabs_after_page_delete = request("GET", f"/agendas/{agenda_id}")["settings"]["page_tabs_v1"]
        expect(all(tab["target"] != f"page:{page_id}" for tab in tabs_after_page_delete), "Deleting a page left an orphan tab")
        request("DELETE", f"/folders/{folder['id']}", expected=204)
        tabs_after_folder_delete = request("GET", f"/agendas/{agenda_id}")["settings"]["page_tabs_v1"]
        expect(all(tab["target"] != f"section:{folder['id']}" for tab in tabs_after_folder_delete), "Deleting a section left an orphan tab")

        jar_b = http.cookiejar.CookieJar()
        opener_b = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(jar_b))
        def request_b(method: str, path: str, body=None, expected=200):
            return request(method, path, body, expected, client_opener=opener_b, client_jar=jar_b)
        request_b("POST", "/auth/register", {
            "email": f"matcha-contract-b-{uuid4().hex}@example.test",
            "password": "Test-only-passphrase-2026", "name": "Outro usuário",
        }, expected=201)
        agenda_b = request_b("POST", "/agendas", {"title": "Agenda B"}, expected=201)
        page_b = request_b("GET", f"/agendas/{agenda_b['id']}/pages")[0]
        request_b("GET", f"/canvas/elements?surface_type=page&page_id={daily['id']}", expected=404)
        request_b("PATCH", f"/canvas/elements/{template['id']}", {"locked": False}, expected=404)
        request_b("DELETE", f"/canvas/elements/{template['id']}", expected=404)
        request_b("POST", "/canvas/elements", {
            "surface_type": "page", "page_id": page_b["id"], "element_type": "widget:task-receipt",
            "x": 0, "y": 0, "width": 200, "height": 200, "rotation": 0, "z_index": 1,
            "locked": False, "data": {"taskIds": [task["id"]]},
        }, expected=404)
        foreign_tab = {"id": "foreign", "label": "Inválido", "color": "#E6E3F7", "target": f"page:{daily['id']}", "order": 0}
        request_b("PATCH", f"/agendas/{agenda_b['id']}", {"settings": {"page_tabs_v1": [foreign_tab]}}, expected=400)
        request_b("DELETE", f"/library/media/{uploaded['id']}", expected=404)
        request_b("GET", f"/daily-entries/{today_key}", expected=404)
        request_b("PUT", f"/daily-entries/{tomorrow_key}", {"mood": "happy", "photo_media_id": uploaded["id"]}, expected=404)
        entry_b = request_b("PUT", f"/daily-entries/{today_key}", {"mood": "happy"})
        expect(entry_b["user_id"] != daily_entry["user_id"], "Daily entry uniqueness leaked across users")
        expect(request("GET", f"/daily-entries/{today_key}")["quick_note"] == "Nota atualizada", "User B changed user A daily entry")
        request("PATCH", f"/daily-entries/{today_key}", {"photo_media_id": uploaded["id"]})
        request("DELETE", f"/library/media/{uploaded['id']}", expected=204)
        expect(request("GET", f"/daily-entries/{today_key}")["photo_media_id"] is None, "Deleting media left a dangling DailyEntry photo reference")

        request("DELETE", f"/agendas/{duplicated_agenda['id']}", expected=204)
        limit_agendas = []
        for index in range(5):
            limit_agendas.append(request("POST", "/agendas", {"title": f"Limite {index}"}, expected=201))
        request("POST", "/agendas", {"title": "Sétima agenda"}, expected=400)

        with sessions() as db:
            current_count = db.query(models.Page).filter(models.Page.agenda_id == agenda_id).count()
            db.add_all([
                models.Page(agenda_id=agenda_id, position=1000 + index, title=f"Limite página {index}", content="", favorite=False)
                for index in range(400 - current_count)
            ])
            db.commit()
        request("POST", f"/agendas/{agenda_id}/pages", {"title": "Página 401"}, expected=400)
        request("POST", f"/pages/{daily['id']}/duplicate", expected=409)

        cascade_agenda = limit_agendas[-1]
        cascade_pages = request("GET", f"/agendas/{cascade_agenda['id']}/pages")
        cascade_page_id = cascade_pages[0]["id"]
        cascade_element = canvas("postit", {"text": "cascade"}, cascade_page_id)
        request("DELETE", f"/agendas/{cascade_agenda['id']}", expected=204)
        with sessions() as db:
            expect(db.get(models.Page, cascade_page_id) is None, "Agenda delete did not cascade pages")
            expect(db.get(models.CanvasElement, cascade_element["id"]) is None, "Agenda delete did not cascade canvas elements")

        print("PASS: real FastAPI auth/ownership, product limits, agenda/page duplication with remapped references, cascades, tabs, canvas, templates, nested settings, DailyEntry, date filters, studies and private media on isolated SQLite.")
    finally:
        server.should_exit = True
        thread.join(timeout=5)
        app.dependency_overrides.clear()
        engine.dispose()
        if media_library.LIBRARY_DIRECTORY.is_relative_to(TEST_OUTPUT.resolve()):
            for generated in media_library.LIBRARY_DIRECTORY.iterdir():
                if generated.is_file() and generated.resolve().is_relative_to(media_library.LIBRARY_DIRECTORY.resolve()):
                    generated.unlink()
            media_library.LIBRARY_DIRECTORY.rmdir()
