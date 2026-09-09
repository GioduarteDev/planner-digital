from __future__ import annotations

import base64
from pathlib import Path

from cryptography.hazmat.primitives import (
    serialization,
)
from cryptography.hazmat.primitives.asymmetric import ec


BACKEND_DIR = Path(__file__).resolve().parent
SECRETS_DIR = BACKEND_DIR / "secrets"
PRIVATE_KEY_PATH = (
    SECRETS_DIR / "vapid_private.pem"
)
ENV_PATH = BACKEND_DIR / ".env"


def base64url(data: bytes) -> str:
    return (
        base64.urlsafe_b64encode(data)
        .rstrip(b"=")
        .decode("ascii")
    )


SECRETS_DIR.mkdir(
    parents=True,
    exist_ok=True,
)

private_key = (
    ec.generate_private_key(
        ec.SECP256R1()
    )
)

private_pem = (
    private_key.private_bytes(
        encoding=serialization.Encoding.PEM,
        format=(
            serialization.PrivateFormat.PKCS8
        ),
        encryption_algorithm=(
            serialization.NoEncryption()
        ),
    )
)

PRIVATE_KEY_PATH.write_bytes(
    private_pem
)

public_bytes = (
    private_key.public_key()
    .public_bytes(
        encoding=(
            serialization.Encoding.X962
        ),
        format=(
            serialization.PublicFormat
            .UncompressedPoint
        ),
    )
)

public_key = base64url(
    public_bytes
)

existing_lines: list[str] = []

if ENV_PATH.exists():
    existing_lines = (
        ENV_PATH.read_text(
            encoding="utf-8"
        ).splitlines()
    )

prefixes = (
    "VAPID_PUBLIC_KEY=",
    "VAPID_PRIVATE_KEY_PATH=",
    "VAPID_SUBJECT=",
)

clean_lines = [
    line
    for line in existing_lines
    if not line.startswith(
        prefixes
    )
]

clean_lines.extend([
    "",
    f"VAPID_PUBLIC_KEY={public_key}",
    (
        "VAPID_PRIVATE_KEY_PATH="
        f"{PRIVATE_KEY_PATH}"
    ),
    (
        "VAPID_SUBJECT="
        "mailto:planner@example.com"
    ),
])

ENV_PATH.write_text(
    "\n".join(clean_lines).rstrip()
    + "\n",
    encoding="utf-8",
)

print(
    "VAPID configurado com sucesso."
)
print(
    f"Chave privada salva em: "
    f"{PRIVATE_KEY_PATH}"
)
print(
    "As variáveis foram adicionadas "
    "ao backend/.env."
)
