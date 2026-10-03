"""Offline regressions for legacy tokens and public orphan-data adoption."""
from datetime import datetime, timedelta, timezone
import unittest
from unittest.mock import patch

from fastapi import Response
import jwt
from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session
from starlette.requests import Request

from app.config import settings
from app.database import Base
from app.models import Agenda
from app.routes import auth
from app.schemas import UserCreate
from app.security import create_access_token, decode_access_token_payload, hash_password, verify_password


class AuthHardeningTests(unittest.TestCase):
    def test_argon2id_uses_independent_salts_and_checks_passwords(self):
        first = hash_password("disposable-password")
        second = hash_password("disposable-password")
        self.assertTrue(first.startswith("$argon2id$"))
        self.assertNotEqual(first, second)
        self.assertTrue(verify_password("disposable-password", first))
        self.assertFalse(verify_password("incorrect", first))

    def test_public_registration_cannot_claim_orphan_agendas(self):
        engine = create_engine("sqlite://")
        self.addCleanup(engine.dispose)
        Base.metadata.create_all(engine)
        with Session(engine) as db:
            agenda = Agenda(title="Private legacy fixture", user_id=None)
            db.add(agenda)
            db.commit()
            agenda_id = agenda.id
            request = Request({"type": "http", "headers": [], "client": ("127.0.0.1", 1234)})
            with patch.object(auth.register_rate_limiter, "check"):
                auth.register(UserCreate(email="orphan-test@example.com", password="disposable-password", name="Fixture"), request, Response(), db)
            db.expire_all()
            self.assertIsNone(db.scalar(select(Agenda.user_id).where(Agenda.id == agenda_id)))

    def test_tokens_require_revocable_session_and_expiration(self):
        base = {"sub": "1", "kind": "access", "exp": datetime.now(timezone.utc) + timedelta(minutes=5)}
        self.assertIsNotNone(decode_access_token_payload(create_access_token(1, "fixture-session")))
        for payload in [base, {**base, "sid": ""}, {"sub": "1", "sid": "fixture-session", "kind": "access"},
                        {**base, "sid": "fixture-session", "exp": datetime.now(timezone.utc) - timedelta(seconds=1)},
                        {**base, "sid": "fixture-session", "kind": "refresh"}]:
            token = jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)
            with self.subTest(fields=list(payload)):
                self.assertIsNone(decode_access_token_payload(token))
        self.assertIsNone(decode_access_token_payload("invalid.fixture.cookie"))


if __name__ == "__main__":
    unittest.main(verbosity=2)
