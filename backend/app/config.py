from pathlib import Path
from typing import Literal

from pydantic import model_validator
from pydantic_settings import (
    BaseSettings,
    SettingsConfigDict,
)


BASE_DIR = (
    Path(__file__)
    .resolve()
    .parent
    .parent
)

ENV_FILE = (
    BASE_DIR / ".env"
)


class Settings(BaseSettings):
    db_host: str
    db_port: int
    db_name: str
    db_user: str
    db_password: str

    jwt_secret: str
    jwt_algorithm: str = "HS256"
    jwt_expiration_minutes: int = 1440

    app_env: Literal["development", "test", "production"] = "development"

    cors_origins: str = ""

    auth_cookie_name: str = "planner_session"
    csrf_cookie_name: str = "planner_csrf"
    cookie_secure: bool = False
    cookie_samesite: Literal["lax", "strict", "none"] = "lax"

    vapid_public_key: str = ""
    vapid_private_key_path: str = ""
    vapid_subject: str = (
        "mailto:planner@example.com"
    )

    @property
    def cors_origin_list(self) -> list[str]:
        return [
            origin.strip().rstrip("/")
            for origin in self.cors_origins.split(",")
            if origin.strip()
        ]

    model_config = SettingsConfigDict(
        env_file=ENV_FILE,
        env_file_encoding="utf-8",
    )

    @model_validator(mode="after")
    def validate_cookie_security(self):
        if self.app_env == "production" and not self.cookie_secure:
            raise ValueError(
                "COOKIE_SECURE deve ser true em produ??o."
            )

        if self.cookie_samesite == "none" and not self.cookie_secure:
            raise ValueError(
                "SameSite=None exige cookie Secure."
            )

        for origin in self.cors_origin_list:
            if "*" in origin:
                raise ValueError(
                    "CORS_ORIGINS n?o aceita wildcard."
                )

            if not origin.startswith(
                ("http://", "https://")
            ):
                raise ValueError(
                    "Cada origem CORS precisa come?ar "
                    "com http:// ou https://."
                )

            if (
                self.app_env == "production"
                and not origin.startswith("https://")
            ):
                raise ValueError(
                    "CORS_ORIGINS deve usar HTTPS "
                    "em produ??o."
                )

        return self


settings = Settings()
