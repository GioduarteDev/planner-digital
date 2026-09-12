import http.cookiejar
import json
import urllib.error
import urllib.request
from pathlib import Path
from uuid import uuid4


BASE_URL = "http://127.0.0.1:8000"
MUTATING_METHODS = {"POST", "PUT", "PATCH", "DELETE"}


def get_csrf_cookie_name():
    name = "planner_csrf"
    env_path = Path("backend/.env")

    if not env_path.exists():
        return name

    for raw_line in env_path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()

        if not line or line.startswith("#") or "=" not in line:
            continue

        key, value = line.split("=", 1)

        if key.strip().upper() == "CSRF_COOKIE_NAME":
            value = value.strip().strip('"').strip("'")

            if value:
                return value

    return name


CSRF_COOKIE_NAME = get_csrf_cookie_name()


class TestFailure(Exception):
    pass


class ApiClient:
    def __init__(self, label):
        self.label = label
        self.cookies = http.cookiejar.CookieJar()
        self.opener = urllib.request.build_opener(
            urllib.request.HTTPCookieProcessor(self.cookies)
        )
        self.registered = False
        self.password = None

    def cookie_value(self, name):
        for cookie in self.cookies:
            if cookie.name == name:
                return cookie.value

        return None

    def request(
        self,
        method,
        path,
        data=None,
        expected=(200,),
    ):
        headers = {
            "Accept": "application/json",
        }

        body = None

        if data is not None:
            headers["Content-Type"] = "application/json"
            body = json.dumps(data).encode("utf-8")

        if method.upper() in MUTATING_METHODS:
            csrf = self.cookie_value(CSRF_COOKIE_NAME)

            if csrf:
                headers["X-CSRF-Token"] = csrf

        req = urllib.request.Request(
            BASE_URL + path,
            data=body,
            headers=headers,
            method=method.upper(),
        )

        try:
            with self.opener.open(req, timeout=15) as response:
                status = response.status
                raw = response.read().decode(
                    "utf-8",
                    errors="replace",
                )

        except urllib.error.HTTPError as exc:
            status = exc.code
            raw = exc.read().decode(
                "utf-8",
                errors="replace",
            )

        except Exception as exc:
            raise TestFailure(
                f"{self.label}: nao consegui conectar ao backend.\n{exc}"
            ) from exc

        if status not in expected:
            raise TestFailure(
                f"{self.label}: {method} {path}\n"
                f"Recebido: HTTP {status}\n"
                f"Esperado: {expected}\n"
                f"Resposta: {raw}"
            )

        if not raw:
            return None

        try:
            return json.loads(raw)

        except json.JSONDecodeError:
            return raw

    def register(self, email, password):
        self.password = password

        result = self.request(
            "POST",
            "/auth/register",
            {
                "email": email,
                "password": password,
                "name": f"Teste {self.label}",
            },
            expected=(201,),
        )

        self.registered = True
        return result

    def delete_account(self):
        if not self.registered:
            return

        self.request(
            "DELETE",
            "/profile/account",
            {
                "password": self.password,
                "confirmation": "DELETE",
            },
            expected=(204,),
        )

        self.registered = False


def blocked(
    client,
    method,
    path,
    data=None,
    expected=(404,),
):
    client.request(
        method,
        path,
        data,
        expected=expected,
    )

    print(
        f"[OK] {client.label} bloqueado: "
        f"{method} {path}"
    )


suffix = uuid4().hex[:12]

email_a = f"security-a-{suffix}@example.com"
email_b = f"security-b-{suffix}@example.com"

password_a = f"PlannerA-{suffix}!"
password_b = f"PlannerB-{suffix}!"

a = ApiClient("Usuario A")
b = ApiClient("Usuario B")


print("=" * 68)
print("SUPER PLANNER - TESTE DE ISOLAMENTO ENTRE USUARIOS")
print("=" * 68)
print()


try:
    print("1. Criando duas contas temporarias...")

    a.register(
        email_a,
        password_a,
    )

    b.register(
        email_b,
        password_b,
    )

    print("[OK] Usuario A criado")
    print("[OK] Usuario B criado")
    print()


    print("2. Criando dados privados do Usuario A...")

    agenda_a = a.request(
        "POST",
        "/agendas",
        {
            "title": f"Agenda A {suffix}",
        },
        expected=(201,),
    )

    agenda_a_id = agenda_a["id"]

    pages_a = a.request(
        "GET",
        f"/agendas/{agenda_a_id}/pages",
    )

    if not pages_a:
        raise TestFailure(
            "A agenda do Usuario A nao possui paginas."
        )

    page_a_id = pages_a[0]["id"]

    task_a = a.request(
        "POST",
        f"/pages/{page_a_id}/tasks",
        {
            "text": f"Tarefa secreta A {suffix}",
        },
        expected=(201,),
    )

    task_a_id = task_a["id"]

    print(
        f"[OK] Agenda A: {agenda_a_id}"
    )
    print(
        f"[OK] Pagina A: {page_a_id}"
    )
    print(
        f"[OK] Tarefa A: {task_a_id}"
    )
    print()


    print("3. Criando dados privados do Usuario B...")

    agenda_b = b.request(
        "POST",
        "/agendas",
        {
            "title": f"Agenda B {suffix}",
        },
        expected=(201,),
    )

    agenda_b_id = agenda_b["id"]

    pages_b = b.request(
        "GET",
        f"/agendas/{agenda_b_id}/pages",
    )

    if not pages_b:
        raise TestFailure(
            "A agenda do Usuario B nao possui paginas."
        )

    page_b_id = pages_b[0]["id"]

    print(
        f"[OK] Agenda B: {agenda_b_id}"
    )
    print(
        f"[OK] Pagina B: {page_b_id}"
    )
    print()


    print("4. Usuario B tentando acessar dados do Usuario A...")

    blocked(
        b,
        "GET",
        f"/agendas/{agenda_a_id}",
    )

    blocked(
        b,
        "PATCH",
        f"/agendas/{agenda_a_id}",
        {
            "title": "INVASAO",
        },
    )

    blocked(
        b,
        "DELETE",
        f"/agendas/{agenda_a_id}",
    )

    blocked(
        b,
        "GET",
        f"/agendas/{agenda_a_id}/pages",
    )

    blocked(
        b,
        "GET",
        f"/pages/{page_a_id}",
    )

    blocked(
        b,
        "PATCH",
        f"/pages/{page_a_id}",
        {
            "title": "INVASAO",
        },
    )

    blocked(
        b,
        "POST",
        f"/pages/{page_a_id}/tasks",
        {
            "text": "Tarefa invasora",
        },
    )

    blocked(
        b,
        "GET",
        f"/tasks/{task_a_id}",
    )

    blocked(
        b,
        "PATCH",
        f"/tasks/{task_a_id}",
        {
            "text": "INVASAO",
        },
    )

    blocked(
        b,
        "DELETE",
        f"/tasks/{task_a_id}",
    )

    print()


    print("5. Testando o sentido contrario: A -> B...")

    blocked(
        a,
        "GET",
        f"/agendas/{agenda_b_id}",
    )

    blocked(
        a,
        "GET",
        f"/pages/{page_b_id}",
    )

    print()


    print("6. Testando protecao da assinatura push...")

    endpoint = (
        "https://example.invalid/push/"
        + suffix
    )

    a.request(
        "POST",
        "/notifications/subscribe",
        {
            "endpoint": endpoint,
            "keys": {
                "p256dh": f"p256dh-{suffix}",
                "auth": f"auth-{suffix}",
            },
        },
        expected=(201,),
    )

    print(
        "[OK] Usuario A registrou a assinatura push"
    )

    blocked(
        b,
        "POST",
        "/notifications/subscribe",
        {
            "endpoint": endpoint,
            "keys": {
                "p256dh": "tentativa-b",
                "auth": "tentativa-b",
            },
        },
        expected=(409,),
    )

    print()


    print("7. Confirmando que os dados do Usuario A continuam intactos...")

    check_agenda = a.request(
        "GET",
        f"/agendas/{agenda_a_id}",
    )

    check_page = a.request(
        "GET",
        f"/pages/{page_a_id}",
    )

    check_task = a.request(
        "GET",
        f"/tasks/{task_a_id}",
    )

    if check_agenda["id"] != agenda_a_id:
        raise TestFailure(
            "Agenda A foi alterada indevidamente."
        )

    if check_page["id"] != page_a_id:
        raise TestFailure(
            "Pagina A foi alterada indevidamente."
        )

    if check_task["id"] != task_a_id:
        raise TestFailure(
            "Tarefa A foi alterada indevidamente."
        )

    if check_task["text"] != f"Tarefa secreta A {suffix}":
        raise TestFailure(
            "Conteudo da tarefa A foi modificado."
        )

    print("[OK] Agenda A intacta")
    print("[OK] Pagina A intacta")
    print("[OK] Tarefa A intacta")

    print()
    print("=" * 68)
    print("RESULTADO: ISOLAMENTO ENTRE USUARIOS PASSOU")
    print("=" * 68)


except TestFailure as exc:
    print()
    print("=" * 68)
    print("FALHA NO TESTE DE SEGURANCA")
    print("=" * 68)
    print(exc)
    raise SystemExit(1)


finally:
    print()
    print("Limpando contas temporarias...")

    for client in (a, b):
        try:
            if client.registered:
                client.delete_account()
                print(
                    f"[OK] {client.label} removido"
                )

        except Exception as exc:
            print(
                f"[AVISO] Nao consegui remover "
                f"{client.label}: {exc}"
            )
