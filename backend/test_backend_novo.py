import getpass
import json
import sys
import urllib.error
import urllib.parse
import urllib.request
from datetime import date, datetime, timedelta, timezone
from uuid import uuid4

BASE_URL = "http://127.0.0.1:8000"

token = None
cleanup_stack = []
passed = []
skipped = []


class TestFailure(Exception):
    pass


def request(method, path, data=None, *, expected=(200,), auth=True):
    global token

    headers = {}
    body = None

    if data is not None:
        headers["Content-Type"] = "application/json"
        body = json.dumps(data).encode("utf-8")

    if auth and token:
        headers["Authorization"] = f"Bearer {token}"

    req = urllib.request.Request(
        BASE_URL + path,
        data=body,
        headers=headers,
        method=method,
    )

    try:
        with urllib.request.urlopen(req, timeout=15) as response:
            status = response.status
            raw = response.read().decode("utf-8")
    except urllib.error.HTTPError as exc:
        raw = exc.read().decode("utf-8", errors="replace")
        try:
            detail = json.loads(raw)
        except Exception:
            detail = raw
        raise TestFailure(
            f"{method} {path} -> HTTP {exc.code}\n{detail}"
        ) from exc
    except Exception as exc:
        raise TestFailure(
            f"Não foi possível falar com o backend em {BASE_URL}.\n{exc}"
        ) from exc

    if status not in expected:
        raise TestFailure(
            f"{method} {path} -> status inesperado {status}; esperado {expected}"
        )

    if not raw:
        return None

    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        return raw


def ok(name):
    passed.append(name)
    print(f"[OK] {name}")


def add_cleanup(method, path):
    cleanup_stack.append((method, path))


def safe_cleanup():
    print("\n--- LIMPEZA DOS DADOS TEMPORÁRIOS ---")
    failures = 0

    while cleanup_stack:
        method, path = cleanup_stack.pop()
        try:
            request(method, path, expected=(200, 204))
            print(f"[LIMPO] {method} {path}")
        except Exception as exc:
            failures += 1
            print(f"[AVISO] não consegui limpar {method} {path}: {exc}")

    if failures == 0:
        print("[OK] Nenhum dado temporário ficou para trás.")
    else:
        print(f"[AVISO] {failures} item(ns) podem precisar de limpeza manual.")


def require(condition, message):
    if not condition:
        raise TestFailure(message)


marker = "SMOKE-" + uuid4().hex[:8].upper()
future = datetime.now(timezone.utc) + timedelta(days=3)
future_end = future + timedelta(hours=1)
future_iso = future.isoformat()
future_end_iso = future_end.isoformat()
future_date = future.date().isoformat()
today = date.today().isoformat()

print("=" * 68)
print("SUPER PLANNER - SMOKE TEST DO BACKEND NOVO")
print("=" * 68)
print(f"Marcador temporário: {marker}")
print("O teste cria dados temporários e tenta apagá-los automaticamente no final.")
print()

try:
    # LOGIN
    email = input("E-mail da sua conta: ").strip()
    password = getpass.getpass("Senha (não aparece na tela): ")

    login = request(
        "POST",
        "/auth/login",
        {"email": email, "password": password},
        expected=(200,),
        auth=False,
    )
    token = login["access_token"]
    ok("Login")

    # PERFIL
    profile = request("GET", "/profile")
    require("id" in profile, "GET /profile não devolveu um perfil válido.")
    ok("Perfil")

    # AGENDAS EXISTENTES
    agendas = request("GET", "/agendas")
    require(isinstance(agendas, list) and len(agendas) >= 1, "A conta não possui nenhuma agenda para o teste.")
    main_agenda_id = agendas[0]["id"]
    ok("Listagem de agendas")

    # PROJETO
    project = request(
        "POST",
        "/projects",
        {
            "title": f"{marker} Projeto",
            "description": f"Projeto temporário {marker}",
            "status": "active",
            "priority": "high",
            "color": "#a8b5a2",
            "due_date": future_date,
        },
        expected=(201,),
    )
    project_id = project["id"]
    add_cleanup("DELETE", f"/projects/{project_id}")
    ok("Projetos - criar")

    project = request(
        "PATCH",
        f"/projects/{project_id}",
        {"description": f"{marker} projeto atualizado"},
    )
    require("atualizado" in project["description"], "PATCH do projeto não persistiu.")
    ok("Projetos - editar")

    # CATEGORIA
    category = request(
        "POST",
        "/categories",
        {"name": f"{marker} Categoria", "color": "#c7b8d6"},
        expected=(201,),
    )
    category_id = category["id"]
    add_cleanup("DELETE", f"/categories/{category_id}")
    ok("Categorias - criar")

    # MATÉRIA
    subject = request(
        "POST",
        "/subjects",
        {"name": f"{marker} Python", "color": "#9fb9cc"},
        expected=(201,),
    )
    subject_id = subject["id"]
    add_cleanup("DELETE", f"/subjects/{subject_id}")
    ok("Matérias - criar")

    # TAREFA INDEPENDENTE
    task = request(
        "POST",
        "/tasks",
        {
            "text": f"{marker} Tarefa independente",
            "description": f"Teste de tarefa {marker}",
            "due_date": future_date,
            "due_at": future_iso,
            "priority": "high",
            "project_id": project_id,
            "category_id": category_id,
            "show_in_calendar": True,
        },
        expected=(201,),
    )
    task_id = task["id"]
    add_cleanup("DELETE", f"/tasks/{task_id}")
    require(task["page_id"] is None, "A tarefa independente veio vinculada a uma página.")
    ok("Tarefas independentes")

    # EVENTO
    event = request(
        "POST",
        "/events",
        {
            "title": f"{marker} Evento",
            "description": f"Evento temporário {marker}",
            "starts_at": future_iso,
            "ends_at": future_end_iso,
            "all_day": False,
            "reminder_minutes": None,
            "project_id": project_id,
            "category_id": category_id,
            "color": "#d7a7b5",
        },
        expected=(201,),
    )
    event_id = event["id"]
    add_cleanup("DELETE", f"/events/{event_id}")
    ok("Eventos com projeto/categoria")

    # MÚLTIPLOS LEMBRETES
    event_reminder_1 = request(
        "POST",
        "/reminders",
        {"event_id": event_id, "minutes_before": 60, "channel": "push", "enabled": True},
        expected=(201,),
    )
    event_reminder_2 = request(
        "POST",
        "/reminders",
        {"event_id": event_id, "minutes_before": 1440, "channel": "push", "enabled": True},
        expected=(201,),
    )
    task_reminder = request(
        "POST",
        "/reminders",
        {"task_id": task_id, "minutes_before": 30, "channel": "push", "enabled": True},
        expected=(201,),
    )

    event_reminders = request("GET", f"/reminders/event/{event_id}")
    task_reminders = request("GET", f"/reminders/task/{task_id}")
    require(
        {r["minutes_before"] for r in event_reminders} >= {60, 1440},
        "O evento não manteve os dois lembretes.",
    )
    require(
        any(r["minutes_before"] == 30 for r in task_reminders),
        "O lembrete da tarefa não foi listado.",
    )
    ok("Múltiplos lembretes por evento/tarefa")

    # ESTUDO
    study = request(
        "POST",
        "/studies",
        {
            "subject": f"{marker} fallback",
            "subject_id": subject_id,
            "project_id": project_id,
            "topic": f"{marker} Funções",
            "study_date": today,
            "duration_minutes": 25,
            "notes": f"Registro temporário {marker}",
        },
        expected=(201,),
    )
    study_id = study["id"]
    add_cleanup("DELETE", f"/studies/{study_id}")
    require(study["subject_id"] == subject_id, "A sessão de estudo não ficou ligada à matéria.")
    require(study["project_id"] == project_id, "A sessão de estudo não ficou ligada ao projeto.")
    ok("Estudos ligados a matéria/projeto")

    # CANVAS DO CALENDÁRIO
    calendar_key = f"month:{future.year:04d}-{future.month:02d}"
    calendar_element = request(
        "POST",
        "/canvas/elements",
        {
            "surface_type": "calendar",
            "surface_key": calendar_key,
            "page_id": None,
            "element_type": "drawing",
            "x": 32,
            "y": 48,
            "width": 180,
            "height": 120,
            "rotation": 0,
            "z_index": 0,
            "locked": False,
            "data": {
                "text": f"{marker} desenho calendário",
                "tool": "pen",
                "strokes": [
                    {
                        "points": [[0, 0], [10, 8], [20, 3]],
                        "width": 3,
                        "opacity": 1,
                    }
                ],
            },
        },
        expected=(201,),
    )
    calendar_element_id = calendar_element["id"]
    add_cleanup("DELETE", f"/canvas/elements/{calendar_element_id}")

    calendar_copy = request(
        "POST",
        f"/canvas/elements/{calendar_element_id}/duplicate",
        None,
        expected=(201,),
    )
    calendar_copy_id = calendar_copy["id"]
    add_cleanup("DELETE", f"/canvas/elements/{calendar_copy_id}")

    calendar_elements = request(
        "GET",
        "/canvas/elements?"
        + urllib.parse.urlencode(
            {"surface_type": "calendar", "surface_key": calendar_key}
        ),
    )
    ids = {item["id"] for item in calendar_elements}
    require(
        calendar_element_id in ids and calendar_copy_id in ids,
        "O canvas do calendário não listou original + duplicado.",
    )
    ok("Canvas do calendário + desenho + duplicação")

    # CANVAS DO PERFIL
    profile_element = request(
        "POST",
        "/canvas/elements",
        {
            "surface_type": "profile",
            "surface_key": "",
            "page_id": None,
            "element_type": "sticker",
            "x": 20,
            "y": 20,
            "width": 90,
            "height": 90,
            "rotation": -4,
            "z_index": 0,
            "locked": False,
            "data": {"text": f"{marker} doodle de perfil", "kind": "test"},
        },
        expected=(201,),
    )
    profile_element_id = profile_element["id"]
    add_cleanup("DELETE", f"/canvas/elements/{profile_element_id}")
    profile_elements = request(
        "GET",
        "/canvas/elements?" + urllib.parse.urlencode({"surface_type": "profile"}),
    )
    require(
        any(item["id"] == profile_element_id for item in profile_elements),
        "O elemento decorativo do perfil não foi persistido.",
    )
    ok("Canvas decorável do perfil")

    # PRESET
    preset = request(
        "POST",
        "/presets",
        {
            "preset_type": "palette",
            "name": f"{marker} Paleta",
            "data": {"colors": ["#111111", "#f7d6e0", "#c7b8d6"]},
        },
        expected=(201,),
    )
    preset_id = preset["id"]
    add_cleanup("DELETE", f"/presets/{preset_id}")
    preset = request(
        "PATCH",
        f"/presets/{preset_id}",
        {"data": {"colors": ["#111111", "#f7d6e0"]}},
    )
    require(len(preset["data"]["colors"]) == 2, "O preset não foi atualizado.")
    ok("Presets/paletas")

    # KIT
    kit = request(
        "POST",
        "/stationery-kits",
        {
            "name": f"{marker} Kit",
            "description": f"Kit temporário {marker}",
            "data": {
                "palette": ["#f7d6e0", "#c7b8d6"],
                "fonts": ["serif"],
                "style": "korean-planner-test",
            },
        },
        expected=(201,),
    )
    kit_id = kit["id"]
    add_cleanup("DELETE", f"/stationery-kits/{kit_id}")
    ok("Kits de papelaria")

    # PÁGINA TEMPORÁRIA + PAPEL AVANÇADO
    temp_page = request(
        "POST",
        f"/agendas/{main_agenda_id}/pages",
        {
            "title": f"{marker} Página",
            "paper_type": "grid",
            "paper_settings": {
                "spacing": 24,
                "line_color": "#d4cfd8",
                "line_opacity": 0.6,
                "paper_color": "#fffdf8",
                "orientation": "portrait",
                "size": "A5",
            },
        },
        expected=(201,),
    )
    temp_page_id = temp_page["id"]
    add_cleanup("DELETE", f"/pages/{temp_page_id}")
    require(temp_page["paper_type"] == "grid", "paper_type não foi salvo.")
    require(temp_page["paper_settings"].get("spacing") == 24, "paper_settings não foi salvo.")
    ok("Papel avançado da página")

    # ELEMENTO NA PÁGINA
    page_element = request(
        "POST",
        "/canvas/elements",
        {
            "surface_type": "page",
            "surface_key": "",
            "page_id": temp_page_id,
            "element_type": "postit",
            "x": 100,
            "y": 130,
            "width": 210,
            "height": 160,
            "rotation": 2,
            "z_index": 0,
            "locked": False,
            "data": {"text": f"{marker} post-it da página", "background": "#fff1a8"},
        },
        expected=(201,),
    )

    # TAREFA VINCULADA À PÁGINA
    page_task = request(
        "POST",
        f"/pages/{temp_page_id}/tasks",
        {
            "text": f"{marker} Tarefa da página",
            "description": f"Tarefa para testar duplicação {marker}",
            "due_date": future_date,
            "due_at": future_iso,
            "priority": "medium",
            "project_id": project_id,
            "category_id": category_id,
            "show_in_calendar": True,
        },
        expected=(201,),
    )
    ok("Canvas/tarefa em página")

    # DUPLICAÇÃO DE PÁGINA
    duplicate_page = request(
        "POST",
        f"/pages/{temp_page_id}/duplicate",
        None,
        expected=(201,),
    )
    duplicate_page_id = duplicate_page["id"]
    add_cleanup("DELETE", f"/pages/{duplicate_page_id}")

    duplicate_elements = request(
        "GET",
        "/canvas/elements?"
        + urllib.parse.urlencode(
            {"surface_type": "page", "page_id": duplicate_page_id}
        ),
    )
    duplicate_tasks = request("GET", f"/pages/{duplicate_page_id}/tasks")

    require(
        any((item.get("data") or {}).get("text") == f"{marker} post-it da página" for item in duplicate_elements),
        "A duplicação da página não copiou o canvas.",
    )
    require(
        any(item["text"] == f"{marker} Tarefa da página" for item in duplicate_tasks),
        "A duplicação da página não copiou a tarefa.",
    )
    require(
        duplicate_page["paper_settings"].get("spacing") == 24,
        "A duplicação da página não copiou paper_settings.",
    )
    ok("Duplicação completa de página")

    # BUSCA NOVA
    search_results = request(
        "GET",
        "/search?" + urllib.parse.urlencode({"q": marker}),
    )
    result_types = {item["type"] for item in search_results}
    required_types = {"project", "category", "subject", "task", "event", "study", "canvas_element"}
    missing_types = required_types - result_types
    require(
        not missing_types,
        f"A busca não encontrou estes tipos novos: {sorted(missing_types)}",
    )
    ok("Busca ampliada")

    # DADOS / STORAGE
    storage = request("GET", "/data/storage")
    export_data = request("GET", "/data/export")
    require(isinstance(storage, dict), "/data/storage não devolveu JSON.")
    require(isinstance(export_data, dict), "/data/export não devolveu JSON.")
    ok("Storage + exportação de dados")

    # DUPLICAÇÃO DE AGENDA, SOMENTE SE FOR SEGURA COM O LIMITE DE 6
    current_agendas = request("GET", "/agendas")
    if len(current_agendas) <= 4:
        temp_agenda = request(
            "POST",
            "/agendas",
            {
                "title": f"{marker} Agenda",
                "cover_color": "#f0ece8",
                "cover_image_url": None,
                "settings": {"test": marker},
            },
            expected=(201,),
        )
        temp_agenda_id = temp_agenda["id"]
        add_cleanup("DELETE", f"/agendas/{temp_agenda_id}")

        agenda_copy = request(
            "POST",
            f"/agendas/{temp_agenda_id}/duplicate",
            None,
            expected=(201,),
        )
        agenda_copy_id = agenda_copy["id"]
        add_cleanup("DELETE", f"/agendas/{agenda_copy_id}")

        copied_pages = request("GET", f"/agendas/{agenda_copy_id}/pages")
        require(len(copied_pages) == 5, "A agenda duplicada não trouxe as 5 páginas.")
        ok("Duplicação de agenda")
    else:
        skipped.append(
            f"Duplicação de agenda: pulada porque sua conta já tem {len(current_agendas)} agendas e o limite é 6."
        )
        print(f"[PULADO] Duplicação de agenda (você já tem {len(current_agendas)} agendas).")

except TestFailure as exc:
    print("\n" + "=" * 68)
    print("TESTE PAROU EM UM ERRO")
    print("=" * 68)
    print(exc)
    exit_code = 1
except KeyboardInterrupt:
    print("\nTeste interrompido pelo usuário.")
    exit_code = 130
except Exception as exc:
    print("\n" + "=" * 68)
    print("ERRO INESPERADO")
    print("=" * 68)
    print(repr(exc))
    exit_code = 1
else:
    exit_code = 0
finally:
    if token:
        safe_cleanup()

print("\n" + "=" * 68)
print("RESUMO")
print("=" * 68)
for item in passed:
    print(f"✅ {item}")
for item in skipped:
    print(f"⚪ {item}")

if exit_code == 0:
    print("\nBACKEND NOVO: SMOKE TEST PASSOU ✅")
else:
    print("\nBACKEND NOVO: HÁ UM PONTO PARA CORRIGIR ⚠️")

sys.exit(exit_code)
