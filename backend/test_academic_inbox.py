"""Real PostgreSQL regressions in a disposable, uniquely named schema.

Run from backend: .venv/Scripts/python.exe test_academic_inbox.py
Only the schema created by this test is removed; application data is untouched.
"""
from concurrent.futures import ThreadPoolExecutor
from uuid import uuid4
from datetime import datetime, timezone

from alembic import command
from alembic.config import Config
import json
import os
import sys
import subprocess
from pathlib import Path
import socket
import threading
import urllib.request
import urllib.error
import uvicorn
from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import Session

import app.database as database


def run():
    original_engine = database.engine
    schema = "test_academic_" + uuid4().hex
    with original_engine.begin() as connection:
        connection.execute(text(f'CREATE SCHEMA "{schema}"'))
    engine = create_engine(original_engine.url, connect_args={"options": f"-csearch_path={schema}"})
    database.engine = engine
    try:
        config = Config("alembic.ini")
        command.upgrade(config, "717bc4ba7ad7")
        # Seed a legacy subject before academic migrations to verify preservation.
        with engine.begin() as connection:
            connection.execute(text("INSERT INTO users (email, password_hash, settings) VALUES ('legacy@test.local', 'test', '{}')"))
            connection.execute(text("INSERT INTO subjects (user_id, name) VALUES (1, 'Legacy')"))
        command.upgrade(config, "head")
        with engine.connect() as connection:
            assert connection.scalar(text("SELECT version_num FROM alembic_version")) == "a924002"
            assert connection.scalar(text("SELECT name FROM subjects WHERE id=1")) == "Legacy"
        inspector = inspect(engine)
        for table in ("tasks", "events", "study_sessions", "projects", "inbox_items"):
            assert "subject_id" in {c["name"] for c in inspector.get_columns(table)}
            assert any(fk["constrained_columns"] == ["subject_id"] and fk["referred_table"] == "subjects" for fk in inspector.get_foreign_keys(table))

        from app.main import app
        from app.dependencies import get_current_user
        from app.models import User

        with Session(engine) as db:
            a = User(email="a@test.local", password_hash="unused", name="A")
            b = User(email="b@test.local", password_hash="unused", name="B")
            db.add_all([a, b]); db.commit(); db.refresh(a); db.refresh(b)
            users = [a, b]
        current = [users[0]]

        def get_test_db():
            with Session(engine) as db:
                yield db

        app.dependency_overrides[database.get_db] = get_test_db
        app.dependency_overrides[get_current_user] = lambda: current[0]
        listener = socket.socket()
        listener.bind(('127.0.0.1', 0))
        base_url = f'http://127.0.0.1:{listener.getsockname()[1]}'
        server = uvicorn.Server(uvicorn.Config(app, lifespan='off', log_level='error'))
        thread = threading.Thread(target=server.run, kwargs={'sockets': [listener]}, daemon=True)
        thread.start()

        def request(method, path, body=None, status=200):
            req = urllib.request.Request(base_url + path, data=json.dumps(body).encode() if body is not None else None, headers={'Content-Type': 'application/json'}, method=method)
            try:
                response = urllib.request.urlopen(req, timeout=10)
            except urllib.error.HTTPError as exc:
                response = exc
            content = response.read()
            assert response.status == status, (method, path, response.status, content)
            return json.loads(content) if content else None

        subjects = [request("POST", "/subjects", {"name": name, "professor": "Professora", "semester": "2026.2"}, 201) for name in ("Banco de Dados", "Python")]
        assert subjects[0]["professor"] == "Professora"
        request("PATCH", f'/subjects/{subjects[0]["id"]}', {"semester": None})
        captures = []
        for extra in ({}, {"optional_date": "2026-09-25"}, {"optional_subject_id": subjects[0]["id"]}, {"optional_date": "2026-09-26", "optional_time": "09:30", "note": "Detalhes", "optional_subject_id": subjects[1]["id"]}):
            captures.append(request("POST", "/inbox", {"text": "Captura", **extra}, 201))
        assert len(request("GET", "/inbox")) == 4
        request("PATCH", f'/inbox/{captures[0]["id"]}', {"text": "Editada", "optional_subject_id": subjects[0]["id"]})
        request("PATCH", f'/inbox/{captures[0]["id"]}', {"text": None}, 422)
        request("POST", "/inbox", {"text": "   "}, 422)
        request("POST", "/inbox", {"text": "x", "status": "invalid"}, 422)
        request("POST", f'/inbox/{captures[0]["id"]}/convert', {"target": "event"}, 422)
        assert next(i for i in request("GET", "/inbox") if i["id"] == captures[0]["id"])["status"] == "new"

        converted = {}
        for target, path in (("task", "/tasks"), ("event", "/events"), ("study", "/studies"), ("project", "/projects"), ("note", None)):
            item = request("POST", "/inbox", {"text": f"Teste {target}", "optional_subject_id": subjects[0]["id"], "optional_date": "2026-09-26", "optional_time": "09:30", "note": "Minha observação"}, 201)
            payload = {"target": target, "duration_minutes": 45, "timezone_offset_minutes": 180}
            url = f'/inbox/{item["id"]}/convert'
            with ThreadPoolExecutor(max_workers=2) as pool:
                results = list(pool.map(lambda _: request("POST", url, payload), range(2)))
            assert results[0]["converted_id"] == results[1]["converted_id"]
            result = results[0]
            assert result["processed_at"] and result["status"] == "processed"
            assert result["converted_type"] == target
            request("PATCH", f'/inbox/{item["id"]}', {"status": "new"}, 409)
            request("POST", url, {"target": "task" if target != "task" else "note"}, 409)
            if path:
                records = request("GET", path)
                assert len(records) == 1, (target, records)
                record = records[0]
                assert record["subject_id"] == subjects[0]["id"]
                converted[target] = record
                if target == "event":
                    assert datetime.fromisoformat(record["starts_at"]).astimezone(timezone.utc).hour == 12
                    request("PATCH", f'{path}/{record["id"]}', {"reminder_minutes": 15})
                if target == "task":
                    assert datetime.fromisoformat(record["due_at"]).astimezone(timezone.utc).hour == 12
                    request("PATCH", f'{path}/{record["id"]}', {"done": True})
                if target == "study":
                    assert record["subject"] == subjects[0]["name"] and record["duration_minutes"] == 45
                request("PATCH", f'{path}/{record["id"]}', {"subject_id": subjects[1]["id"]})
        assert request("GET", "/tasks")[0]["done"]
        # A new client/session sees all committed receipts (reload persistence).
        assert len(request("GET", "/inbox")) == 9
        current[0] = users[1]
        for path in ("/subjects", "/tasks", "/events", "/studies", "/projects", "/inbox"):
            assert request("GET", path) == []
        request("POST", "/inbox", {"text": "Cross user", "optional_subject_id": subjects[0]["id"]}, 404)
        for method, suffix, payload in (("PATCH", "", {"text": "x"}), ("DELETE", "", None), ("POST", "/convert", {"target": "note"})):
            request(method, f'/inbox/{captures[0]["id"]}{suffix}', payload, 404)
        for target, path in (("task", "/tasks"), ("event", "/events"), ("study", "/studies"), ("project", "/projects")):
            request("PATCH", f'{path}/{converted[target]["id"]}', {"subject_id": subjects[0]["id"]}, 404)
        own = request("POST", "/inbox", {"text": "own"}, 201)
        request("PATCH", f'/inbox/{own["id"]}', {"optional_subject_id": subjects[0]["id"]}, 404)
        request("DELETE", f'/inbox/{own["id"]}', status=204)
        current[0] = users[0]
        request("DELETE", f'/subjects/{subjects[1]["id"]}', status=204)
        assert request("GET", "/tasks")[0]["subject_id"] is None
        assert len(app.openapi()["paths"]) >= 85
        if '--browser' in sys.argv:
            subprocess.run(['node', 'tests/academic-browser.mjs'], cwd=Path(__file__).resolve().parent.parent / 'frontend', env={**os.environ, 'ACADEMIC_TEST_API': base_url}, check=True)
        server.should_exit = True
        thread.join(timeout=10)
        app.dependency_overrides.clear()
        print("PASS: fresh migration chain, upgrade with legacy data, FKs, CRUD, all conversions, concurrent idempotency, persistence, null validation and user isolation")
    finally:
        if 'server' in locals():
            server.should_exit = True
            thread.join(timeout=10)
        database.engine = original_engine
        engine.dispose()
        # schema consists only of our fixed prefix and a uuid, never user input.
        assert schema.startswith("test_academic_") and len(schema) == 46
        with original_engine.begin() as connection:
            connection.execute(text(f'DROP SCHEMA "{schema}" CASCADE'))


if __name__ == "__main__":
    run()
