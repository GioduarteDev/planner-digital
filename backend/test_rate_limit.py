import json
import urllib.error
import urllib.request

URL = "http://127.0.0.1:8000/auth/login"

payload = json.dumps(
    {
        "email": "rate-limit-test@example.com",
        "password": "senha-errada-123",
    }
).encode("utf-8")

print("TESTE REAL DE RATE LIMIT")
print("=" * 45)

for attempt in range(1, 12):
    request = urllib.request.Request(
        URL,
        data=payload,
        headers={
            "Content-Type": "application/json",
        },
        method="POST",
    )

    try:
        with urllib.request.urlopen(
            request,
            timeout=10,
        ) as response:
            status = response.status
            retry_after = response.headers.get("Retry-After")

    except urllib.error.HTTPError as exc:
        status = exc.code
        retry_after = exc.headers.get("Retry-After")

    print(f"Tentativa {attempt}: HTTP {status}")

    if attempt <= 10 and status != 401:
        raise SystemExit(
            f"ERRO: tentativa {attempt} deveria retornar 401, "
            f"mas retornou {status}."
        )

    if attempt == 11:
        if status != 429:
            raise SystemExit(
                f"ERRO: tentativa 11 deveria retornar 429, "
                f"mas retornou {status}."
            )

        if not retry_after:
            raise SystemExit(
                "ERRO: HTTP 429 sem Retry-After."
            )

        print(f"Retry-After: {retry_after} segundos")

print()
print("=" * 45)
print("RESULTADO: RATE LIMIT PASSOU")
print("=" * 45)
