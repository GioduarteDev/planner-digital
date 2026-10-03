"""Release checks using real auth/API, disposable PostgreSQL and temporary uploads.

Run from backend. Never starts the reminder worker or sends external HTTP/DNS.
"""
import base64
from contextlib import ExitStack
import importlib
from pathlib import Path
import socket
import threading
from tempfile import TemporaryDirectory
from unittest.mock import patch
from uuid import uuid4

from alembic import command
from alembic.config import Config
import requests
from sqlalchemy import create_engine, text
from sqlalchemy.orm import Session
import uvicorn

import app.database as database


def run():
    original = database.engine
    schema = "test_release_" + uuid4().hex
    with original.begin() as connection:
        connection.execute(text(f'CREATE SCHEMA "{schema}"'))
    engine = create_engine(original.url, connect_args={"options": f"-csearch_path={schema}"})
    server = thread = None
    try:
        with ExitStack() as stack:
            stack.enter_context(patch.object(database, "engine", engine))
            config = Config("alembic.ini")
            command.upgrade(config, "head")
            command.downgrade(config, "a924002")
            command.upgrade(config, "head")
            print("PASS: empty database upgrade, recent downgrade and re-upgrade")
            # Route imports can create directories; suppress that side effect,
            # then redirect every upload path before serving any requests.
            with patch.object(Path, "mkdir"):
                from app.main import app
            root = Path(stack.enter_context(TemporaryDirectory(prefix="matcha-release-")))
            for module in ("profile", "private_uploads", "media", "media_library", "canvas",
                           "page_templates", "pages", "agendas", "duplication", "data_management"):
                route = importlib.import_module("app.routes." + module)
                for name, value in list(vars(route).items()):
                    if name.isupper() and isinstance(value, Path) and "uploads" in value.parts:
                        directory = root if value.name == "uploads" else root / value.name
                        directory.mkdir(parents=True, exist_ok=True)
                        stack.enter_context(patch.object(route, name, directory))
            from app.routes import notifications
            stack.enter_context(patch.object(notifications, "webpush", side_effect=AssertionError("No real push")))
            real_dns = socket.getaddrinfo

            def local_dns(host, port, *args, **kwargs):
                if host == "fcm.googleapis.com":
                    return [(socket.AF_INET, socket.SOCK_STREAM, socket.IPPROTO_TCP, "", ("8.8.8.8", 443))]
                if host not in ("127.0.0.1", "localhost", "::1"):
                    raise AssertionError("External DNS blocked")
                return real_dns(host, port, *args, **kwargs)

            stack.enter_context(patch.object(socket, "getaddrinfo", side_effect=local_dns))

            def get_db():
                with Session(engine) as db:
                    yield db

            app.dependency_overrides[database.get_db] = get_db
            listener = socket.socket()
            listener.bind(("127.0.0.1", 0))
            base = f"http://127.0.0.1:{listener.getsockname()[1]}"
            server = uvicorn.Server(uvicorn.Config(app, lifespan="off", log_level="error"))
            thread = threading.Thread(target=server.run, kwargs={"sockets": [listener]}, daemon=True)
            thread.start()
            from app.rate_limit import login_rate_limiter, register_rate_limiter
            for filename in ("test_login_security.py", "test_user_isolation.py", "test_rate_limit.py"):
                login_rate_limiter._requests.clear()
                register_rate_limiter._requests.clear()
                source = Path(filename).read_text(encoding="utf-8-sig").replace("http://127.0.0.1:8000", base)
                exec(compile(source, filename, "exec"), {"__name__": "__main__", "__file__": filename})
            login_rate_limiter._requests.clear()
            register_rate_limiter._requests.clear()
            sessions = [requests.Session(), requests.Session()]
            for session in sessions:
                session.trust_env = False
                stack.callback(session.close)

            def api(who, method, path, body=None, expected=200, **kwargs):
                session = sessions[who]
                csrf = session.cookies.get("planner_csrf")
                headers = {"X-CSRF-Token": csrf} if csrf else {}
                response = session.request(method, base + path, json=body, headers=headers, timeout=10, **kwargs)
                assert response.status_code == expected, (method, path, response.status_code, response.text)
                return response.json() if response.content and response.headers.get("content-type", "").startswith("application/json") else response.content

            password = "release-disposable-password"
            for who in (0, 1):
                api(who, "POST", "/auth/register", {"email": f"release-{who}@test.local", "password": password, "name": "Test"}, 201)
            for path, body, changes in [
                ("tasks", {"text": "private task"}, {"text": "stolen"}),
                ("events", {"title": "private event", "starts_at": "2026-10-02T12:00:00Z"}, {"title": "stolen"}),
                ("studies", {"subject": "private study", "study_date": "2026-10-02", "duration_minutes": 25}, {"topic": "stolen"}),
                ("subjects", {"name": "private subject"}, {"name": "stolen"}),
                ("projects", {"title": "private project"}, {"title": "stolen"}),
                ("inbox", {"text": "private capture"}, {"text": "stolen"}),
            ]:
                item = api(0, "POST", "/" + path, body, 201)
                target = f'/{path}/{item["id"]}'
                for method, payload in (("PATCH", changes), ("DELETE", None)):
                    api(1, method, target, payload, 404)
                if path not in ("subjects", "inbox"):
                    api(1, "GET", target, expected=404)
                assert not api(1, "GET", "/" + path)
                assert any(row["id"] == item["id"] for row in api(0, "GET", "/" + path))
            agenda = api(0, "POST", "/agendas", {"title": "private agenda"}, 201)
            page = api(0, "GET", f'/agendas/{agenda["id"]}/pages')[0]
            for target, change in [(f'/agendas/{agenda["id"]}', {"title": "stolen"}), (f'/pages/{page["id"]}', {"title": "stolen"})]:
                api(1, "GET", target, expected=404)
                api(1, "PATCH", target, change, 404)
                api(1, "DELETE", target, expected=404)
            png = base64.b64decode("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=")
            media = api(0, "POST", f'/pages/{page["id"]}/media', expected=201, files={"file": ("test.png", png, "image/png")})
            api(1, "PATCH", f'/media/{media["id"]}', {"x": 2}, 404)
            api(1, "DELETE", f'/media/{media["id"]}', expected=404)
            api(1, "GET", media["file_url"], expected=404)
            assert api(0, "GET", media["file_url"]) == png
            template = api(0, "POST", f'/pages/{page["id"]}/templates', {"name": "private template"}, 201)
            api(1, "PATCH", f'/templates/{template["id"]}', {"name": "stolen"}, 404)
            api(1, "DELETE", f'/templates/{template["id"]}', expected=404)
            assert not api(1, "GET", "/templates")
            api(0, "PUT", "/daily-entries/2026-10-02", {"quick_note": "private note"})
            for method, body in (("GET", None), ("PATCH", {"quick_note": "stolen"}), ("DELETE", None)):
                api(1, method, "/daily-entries/2026-10-02", body, 404)
            # CSRF and session revocation are exercised through real dependencies.
            response = sessions[0].post(base + "/tasks", json={"text": "no csrf"}, timeout=10)
            assert response.status_code == 403
            from test_security_audit import verify_security_audit
            verify_security_audit(api, sessions, base, page, media, password)
            api(1, "DELETE", "/profile/account", {"password": password, "confirmation": "DELETE"}, 204)
            assert api(0, "GET", media["file_url"]) == png
            replay_cookie = sessions[0].cookies.get("planner_session")
            api(0, "POST", "/auth/logout", expected=204)
            assert requests.get(base + "/auth/me", cookies={"planner_session": replay_cookie}, timeout=10).status_code == 401
            api(0, "GET", "/auth/me", expected=401)
            api(0, "POST", "/auth/login", {"email": "release-0@test.local", "password": password})
            api(0, "GET", "/auth/me")
            print("PASS: real auth, CSRF, logout/login, A/B ownership and private upload survival")
            app.dependency_overrides.clear()
    finally:
        if server:
            server.should_exit = True
        if thread:
            thread.join(timeout=10)
        engine.dispose()
        with original.begin() as connection:
            connection.execute(text(f'DROP SCHEMA "{schema}" CASCADE'))


if __name__ == "__main__":
    run()
