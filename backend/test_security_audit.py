"""Additional defensive API checks, called only by the disposable release runner."""
from urllib.parse import quote

import requests


def verify_security_audit(api, sessions, base, page, media, password):
    a_id = api(0, "GET", "/auth/me")["id"]
    b_id = api(1, "GET", "/auth/me")["id"]
    internal = {"user_id": a_id, "password_hash": "ignored", "session_key": "ignored", "created_at": "2000-01-01"}
    created = {}
    for path, body, changes in [
        ("categories", {"name": "audit private"}, {"name": "changed"}),
        ("habits", {"name": "audit private", "days_of_week": [0], "time_of_day": "09:00"}, {"name": "changed"}),
        ("presets", {"name": "audit private", "preset_type": "color", "data": {}}, {"name": "changed"}),
        ("stationery-kits", {"name": "audit private", "data": {}}, {"name": "changed"}),
    ]:
        item = api(0, "POST", "/" + path, body, 201)
        created[path] = item
        for method, payload in (("PATCH", changes), ("DELETE", None)):
            api(1, method, f'/{path}/{item["id"]}', payload, 404)
        assert not api(1, "GET", "/" + path)
    agenda_id = page["agenda_id"]
    folder = api(0, "POST", f"/agendas/{agenda_id}/folders", {"title": "private folder"}, 201)
    block = api(0, "POST", f'/pages/{page["id"]}/blocks', {"data": {"text": "private block"}}, 201)
    for path, item, changes in [("folders", folder, {"title": "changed"}), ("blocks", block, {"data": {"text": "changed"}})]:
        api(1, "PATCH", f'/{path}/{item["id"]}', changes, 404)
        api(1, "DELETE", f'/{path}/{item["id"]}', expected=404)
    api(1, "GET", f"/agendas/{agenda_id}/folders", expected=404)
    api(1, "GET", f'/pages/{page["id"]}/blocks', expected=404)
    for path in (f"/agendas/{agenda_id}/duplicate", f'/pages/{page["id"]}/duplicate'):
        api(1, "POST", path, {}, 404)
    canvas = api(0, "POST", "/canvas/elements", {"surface_type": "page", "page_id": page["id"], "element_type": "text"}, 201)
    api(1, "PATCH", f'/canvas/elements/{canvas["id"]}', {"data": {}}, 404)
    api(1, "DELETE", f'/canvas/elements/{canvas["id"]}', expected=404)
    api(1, "POST", f'/canvas/elements/{canvas["id"]}/duplicate', {}, 404)
    api(1, "POST", "/canvas/elements", {"surface_type": "page", "page_id": page["id"], "element_type": "text"}, 404)
    api(1, "GET", f'/canvas/elements?surface_type=page&page_id={page["id"]}', expected=404)
    photo = api(0, "POST", "/library/media", expected=201, files={"file": ("../original.png", api(0, "GET", media["file_url"]), "image/png")}, data={"media_type": "image"})
    for method, body in (("PATCH", {"name": "changed"}), ("DELETE", None)):
        api(1, method, f'/library/media/{photo["id"]}', body, 404)
    api(1, "GET", photo["file_url"], expected=404)
    api(1, "POST", f'/canvas/elements/from-library/{photo["id"]}', {"surface_type": "profile", "element_type": "image"}, 404)
    api(1, "PUT", "/daily-entries/2026-10-05", {"photo_media_id": photo["id"]}, 404)
    api(0, "PUT", "/weekly-reviews/2026-10-05", {"reflection": "private reflection"})
    assert api(1, "GET", "/weekly-reviews/2026-10-05")["reflection"] == ""
    api(1, "PUT", "/weekly-reviews/2026-10-05", {"reflection": "B reflection"})
    assert api(0, "GET", "/weekly-reviews/2026-10-05")["reflection"] == "private reflection"
    subject = api(0, "GET", "/subjects")[0]
    project = api(0, "GET", "/projects")[0]
    event = api(0, "GET", "/events")[0]
    task = api(0, "POST", "/tasks", {"text": "private reminder target", "due_at": "2026-10-05T09:00:00Z"}, 201)
    for path, body, links in [
        ("tasks", {"text": "attempt"}, {"subject_id": subject["id"], "project_id": project["id"], "category_id": created["categories"]["id"]}),
        ("events", {"title": "attempt", "starts_at": "2026-10-05T09:00:00Z"}, {"subject_id": subject["id"], "project_id": project["id"], "category_id": created["categories"]["id"]}),
        ("studies", {"subject": "attempt", "study_date": "2026-10-05", "duration_minutes": 20}, {"subject_id": subject["id"], "project_id": project["id"]}),
    ]:
        for field, value in links.items():
            api(1, "POST", "/" + path, {**body, field: value}, 404)
    api(1, "POST", "/inbox", {"text": "attempt", "optional_subject_id": subject["id"]}, 404)
    capture = api(0, "GET", "/inbox")[0]
    api(1, "POST", f'/inbox/{capture["id"]}/convert', {"target": "task"}, 404)
    api(1, "POST", "/canvas/elements", {"surface_type": "profile", "element_type": "task_receipt", "data": {"task_ids": [task["id"]]}}, 404)
    for target, value in (("task_id", task["id"]), ("event_id", event["id"]), ("habit_id", created["habits"]["id"])):
        api(1, "POST", "/reminders", {target: value}, 404)
    reminder = api(0, "POST", "/reminders", {"event_id": event["id"]}, 201)
    api(1, "PATCH", f'/reminders/{reminder["id"]}', {"enabled": False}, 404)
    api(1, "DELETE", f'/reminders/{reminder["id"]}', expected=404)
    api(1, "GET", f'/reminders/event/{event["id"]}', expected=404)
    own = api(1, "POST", "/tasks", {"text": "mass assignment", **internal}, 201)
    assert own["user_id"] == b_id
    api(1, "PATCH", "/profile", {**internal, "id": a_id})
    assert api(1, "GET", "/profile")["id"] == b_id
    assert not api(1, "GET", "/search?q=private")
    api(1, "GET", "/search?q=" + quote("' OR 1=1 --"))
    # Authentication and CSRF failures must precede resource lookup or writes.
    for path, payload in [("/tasks", {"text": "attempt"}), ("/notifications/test", {})]:
        response = sessions[1].post(base + path, json=payload, headers={"X-CSRF-Token": "incorrect"}, timeout=10)
        assert response.status_code == 403
    response = sessions[1].patch(base + "/profile/settings", json={"settings": {}}, timeout=10)
    assert response.status_code == 403
    for path in ("/uploads/page_media/..%2Foutside.png", "/uploads/profile/%00", "/uploads/page_media/%2Fetc%2Fpasswd"):
        api(1, "GET", path, expected=404)
    for filename, mime, content in [("bad.svg", "image/svg+xml", b"<svg></svg>"), ("bad.html", "image/png", b"<html>fixture</html>"), ("bad.exe", "image/png", b"MZfixture")]:
        api(1, "POST", "/library/media", expected=415, files={"file": (filename, content, mime)})
    assert "../" not in photo["file_url"]
    auth_cookie = next(c for c in sessions[0].cookies if c.name == "planner_session")
    assert "HttpOnly" in auth_cookie._rest and auth_cookie.path == "/" and auth_cookie.expires
    sessions_response = api(0, "GET", "/auth/sessions")
    assert all("session_key" not in row for row in sessions_response)
    api(1, "DELETE", f'/auth/sessions/{sessions_response[0]["id"]}', expected=404)
    with requests.Session() as extra:
        extra.trust_env = False
        response = extra.post(base + "/auth/login", json={"email": "release-0@test.local", "password": password}, timeout=10)
        assert response.status_code == 200
        stolen = extra.cookies.get("planner_session")
        other = next(row for row in api(0, "GET", "/auth/sessions") if not row["current"])
        api(0, "DELETE", f'/auth/sessions/{other["id"]}', expected=204)
        assert extra.get(base + "/auth/me", timeout=10).status_code == 401
        assert requests.get(base + "/auth/me", cookies={"planner_session": stolen}, timeout=10).status_code == 401
        assert extra.post(base + "/auth/login", json={"email": "release-0@test.local", "password": password}, timeout=10).status_code == 200
        new_password = "changed-disposable-password"
        api(0, "POST", "/profile/change-password", {"current_password": password, "new_password": new_password}, 204)
        assert extra.get(base + "/auth/me", timeout=10).status_code == 401
        assert extra.post(base + "/auth/login", json={"email": "release-0@test.local", "password": password}, timeout=10).status_code == 401
        assert extra.post(base + "/auth/login", json={"email": "release-0@test.local", "password": new_password}, timeout=10).status_code == 200
        api(0, "POST", "/profile/change-password", {"current_password": new_password, "new_password": password}, 204)
    for value in ("invalid.fixture.cookie", ""):
        assert requests.get(base + "/auth/me", cookies={"planner_session": value}, timeout=10).status_code == 401
    print("PASS: extended ownership, foreign relationships, duplication, receipts, uploads/traversal, SQL fixture, mass assignment, session revocation/replay and CSRF")
