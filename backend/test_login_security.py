import http.cookiejar
import json
import urllib.error
import urllib.request
from uuid import uuid4


BASE_URL = "http://127.0.0.1:8000"
CSRF_COOKIE = "planner_csrf"


def make_client():
    cookies = http.cookiejar.CookieJar()

    opener = urllib.request.build_opener(
        urllib.request.HTTPCookieProcessor(
            cookies
        )
    )

    return opener, cookies


def csrf_value(cookies):
    for cookie in cookies:
        if cookie.name == CSRF_COOKIE:
            return cookie.value

    return None


def request(
    opener,
    method,
    path,
    data=None,
    headers=None,
):
    body = None

    final_headers = {
        "Accept": "application/json",
    }

    if headers:
        final_headers.update(headers)

    if data is not None:
        body = json.dumps(
            data
        ).encode("utf-8")

        final_headers[
            "Content-Type"
        ] = "application/json"

    req = urllib.request.Request(
        BASE_URL + path,
        data=body,
        headers=final_headers,
        method=method,
    )

    try:
        with opener.open(
            req,
            timeout=15,
        ) as response:
            raw = response.read().decode(
                "utf-8"
            )

            return (
                response.status,
                json.loads(raw)
                if raw
                else None,
            )

    except urllib.error.HTTPError as exc:
        raw = exc.read().decode(
            "utf-8"
        )

        return (
            exc.code,
            json.loads(raw)
            if raw
            else None,
        )


suffix = uuid4().hex[:12]

email = (
    f"login-security-"
    f"{suffix}@example.com"
)

password = (
    f"PlannerLogin-{suffix}!"
)

register_client, register_cookies = (
    make_client()
)

print("TESTE DE SEGURANCA DO LOGIN")
print("=" * 50)


try:
    status, _ = request(
        register_client,
        "POST",
        "/auth/register",
        {
            "email": email,
            "password": password,
            "name": "Teste Login",
        },
    )

    if status != 201:
        raise SystemExit(
            f"ERRO: cadastro retornou {status}"
        )

    print("OK: conta temporaria criada")


    unknown_client, _ = make_client()

    status_unknown, body_unknown = request(
        unknown_client,
        "POST",
        "/auth/login",
        {
            "email":
                f"inexistente-{suffix}@example.com",
            "password": "senha-incorreta",
        },
    )

    if status_unknown != 401:
        raise SystemExit(
            "ERRO: email inexistente "
            f"retornou {status_unknown}"
        )

    print(
        "OK: email inexistente retorna 401"
    )


    wrong_client, _ = make_client()

    status_wrong, body_wrong = request(
        wrong_client,
        "POST",
        "/auth/login",
        {
            "email": email,
            "password": "senha-incorreta",
        },
    )

    if status_wrong != 401:
        raise SystemExit(
            "ERRO: senha errada "
            f"retornou {status_wrong}"
        )

    if (
        body_unknown
        != body_wrong
    ):
        raise SystemExit(
            "ERRO: respostas de login "
            "invalido sao diferentes."
        )

    print(
        "OK: login invalido usa mensagem uniforme"
    )


    valid_client, _ = make_client()

    status_valid, body_valid = request(
        valid_client,
        "POST",
        "/auth/login",
        {
            "email": email,
            "password": password,
        },
    )

    if status_valid != 200:
        raise SystemExit(
            "ERRO: login valido "
            f"retornou {status_valid}"
        )

    if (
        not isinstance(body_valid, dict)
        or "user" not in body_valid
    ):
        raise SystemExit(
            "ERRO: resposta do login "
            "valido esta incorreta."
        )

    print("OK: login valido continua funcionando")


    print()
    print("=" * 50)
    print(
        "RESULTADO: SEGURANCA DO LOGIN PASSOU"
    )
    print("=" * 50)


finally:
    csrf = csrf_value(
        register_cookies
    )

    if csrf:
        status, _ = request(
            register_client,
            "DELETE",
            "/profile/account",
            {
                "password": password,
                "confirmation": "DELETE",
            },
            {
                "X-CSRF-Token": csrf,
            },
        )

        if status == 204:
            print(
                "OK: conta temporaria removida"
            )
        else:
            print(
                "AVISO: limpeza retornou "
                f"HTTP {status}"
            )
