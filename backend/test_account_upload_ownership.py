"""Account deletion regressions with SQLite and uploads in a temporary directory.

Run from backend: .venv/Scripts/python.exe -B test_account_upload_ownership.py
Calls the real route functions; never connects to PostgreSQL or uses real uploads.
"""
import asyncio
import base64
from contextlib import ExitStack
from io import BytesIO
from pathlib import Path
from tempfile import TemporaryDirectory
import unittest
from unittest.mock import patch
from uuid import uuid4

from fastapi import HTTPException, UploadFile
from sqlalchemy import create_engine, event, func, select
from sqlalchemy.orm import Session
from starlette.datastructures import Headers

from app.database import Base
from app.models import Agenda, CanvasElement, MediaLibraryItem, Page, PageMedia, PageTemplate, User
# These modules normally mkdir their production upload directories at import.
# Suppress that side effect; all directories are redirected in setUp below.
with patch.object(Path, "mkdir"):
    from app.routes import agendas, canvas, media, media_library, page_templates, profile
from app.schemas import AgendaCreate, AgendaUpdate, CanvasElementCreate, DeleteAccountRequest
from app.security import hash_password


PASSWORD = "isolated-account-test-password"
PNG = base64.b64decode(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII="
)


class AccountUploadOwnershipTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.password_hash = hash_password(PASSWORD)

    def setUp(self):
        self.resources = ExitStack()
        self.addCleanup(self.resources.close)
        temporary = self.resources.enter_context(TemporaryDirectory(prefix="matcha-account-"))
        self.upload_root = Path(temporary) / "uploads"
        directories = {
            "PROFILE_DIRECTORY": "profile",
            "PAGE_MEDIA_DIRECTORY": "page_media",
            "UPLOAD_DIRECTORY": "page_media",
            "CANVAS_MEDIA_DIRECTORY": "canvas_media",
            "MEDIA_LIBRARY_DIRECTORY": "media_library",
            "LIBRARY_DIRECTORY": "media_library",
            "TEMPLATE_MEDIA_DIRECTORY": "template_media",
            "TEMPLATE_CANVAS_MEDIA_DIRECTORY": "template_canvas_media",
        }
        for category in set(directories.values()):
            (self.upload_root / category).mkdir(parents=True, exist_ok=True)
        for module in (profile, canvas, media, media_library, page_templates):
            for attribute, category in directories.items():
                if hasattr(module, attribute):
                    self.resources.enter_context(patch.object(module, attribute, self.upload_root / category))
            if hasattr(module, "UPLOAD_ROOT"):
                self.resources.enter_context(patch.object(module, "UPLOAD_ROOT", self.upload_root))

        self.engine = create_engine("sqlite://")
        self.resources.callback(self.engine.dispose)

        @event.listens_for(self.engine, "connect")
        def enable_foreign_keys(connection, _):
            connection.execute("PRAGMA foreign_keys=ON")

        Base.metadata.create_all(self.engine)
        self.db = self.resources.enter_context(Session(self.engine, expire_on_commit=False))

    def user(self):
        user = User(email=f"{uuid4().hex}@account.test", password_hash=self.password_hash)
        self.db.add(user)
        self.db.commit()
        return user

    def image(self):
        return UploadFile(BytesIO(PNG), filename="fixture.png", headers=Headers({"content-type": "image/png"}))

    def library_upload(self, user):
        return asyncio.run(media_library.upload_library_media(
            media_type="image", name="Owned fixture", kit_name=None,
            file=self.image(), db=self.db, current_user=user,
        ))

    def owned_uploads(self, user):
        """Generate all six storage categories through the actual write routes."""
        before = set(self.upload_root.rglob("*.png"))
        asyncio.run(profile.upload_profile_photo(self.image(), self.db, user))
        asyncio.run(profile.upload_profile_cover(self.image(), self.db, user))
        library = self.library_upload(user)
        agenda = agendas.create_agenda(AgendaCreate(title="Owned agenda"), self.db, user)
        page = self.db.scalar(select(Page).where(Page.agenda_id == agenda.id).order_by(Page.id))
        asyncio.run(media.upload_page_media(page.id, "image", self.image(), self.db, user))
        canvas.create_element_from_library(
            library.id, CanvasElementCreate(surface_type="page", page_id=page.id, element_type="image"),
            self.db, user,
        )
        page_templates.save_page_as_template(
            page.id, page_templates.PageTemplateCreate(name="Owned template"), self.db, user,
        )
        return agenda, library, set(self.upload_root.rglob("*.png")) - before

    def delete(self, user, password=PASSWORD):
        result = profile.delete_account(
            DeleteAccountRequest(password=password, confirmation="DELETE"), self.db, user,
        )
        # A real request closes its session after the direct SQL cascade.
        # Avoid stale ORM identities when this fixture reuses SQLite IDs.
        self.db.expunge_all()
        return result

    def assert_account_removed(self, user_id, agenda_id):
        self.assertIsNone(self.db.scalar(select(User.id).where(User.id == user_id)))
        for model in (Agenda, MediaLibraryItem, CanvasElement, PageTemplate):
            self.assertEqual(self.db.scalar(select(func.count()).select_from(model).where(model.user_id == user_id)), 0)
        self.assertEqual(self.db.scalar(select(func.count()).select_from(Page).where(Page.agenda_id == agenda_id)), 0)
        self.assertEqual(self.db.scalar(select(func.count()).select_from(PageMedia)), 1)

    def test_foreign_cover_cannot_delete_any_category_of_another_users_uploads(self):
        owner = self.user()
        owner_id = owner.id
        _, owner_library, protected = self.owned_uploads(owner)
        library_id = owner_library.id
        snapshots = {path: path.read_bytes() for path in protected}
        self.assertEqual({path.parent.name for path in protected}, {
            "profile", "page_media", "media_library", "canvas_media",
            "template_media", "template_canvas_media",
        })
        for target in sorted(protected):
            with self.subTest(category=target.parent.name, filename=target.name):
                attacker = self.user()
                attacker_id = attacker.id
                agenda, _, own_paths = self.owned_uploads(attacker)
                agenda_id = agenda.id
                foreign_url = "/uploads/" + target.relative_to(self.upload_root).as_posix()
                agendas.update_agenda(agenda.id, AgendaUpdate(cover_image_url=foreign_url), self.db, attacker)

                self.delete(attacker)

                self.assert_account_removed(attacker_id, agenda_id)
                self.assertTrue(all(not path.exists() for path in own_paths))
                for path, content in snapshots.items():
                    self.assertTrue(path.is_file(), f"Foreign upload deleted: {path}")
                    self.assertEqual(path.read_bytes(), content)
                self.assertEqual(self.db.scalar(select(User.email).where(User.id == owner_id)), owner.email)
                self.assertEqual(self.db.scalar(select(MediaLibraryItem.user_id).where(MediaLibraryItem.id == library_id)), owner_id)

    def test_invalid_or_unowned_cover_references_do_not_authorize_deletion(self):
        sentinel = self.upload_root / "media_library" / "unowned.png"
        sentinel.write_bytes(PNG)
        outside = self.upload_root.parent / "outside.png"
        outside.write_bytes(PNG)
        references = (
            "/uploads/media_library/unowned.png",
            "https://example.test/uploads/media_library/unowned.png",
            "/uploads/../outside.png",
            "/uploads/profile/../media_library/unowned.png",
            "/uploads/invalid/../media_library/unowned.png",
            "/uploads/media_library/nested/../unowned.png",
            "/uploads/media_library/..\\media_library\\unowned.png",
            "/uploads/media_library/%2e%2e/unowned.png",
            "/uploads/media_library/unowned.png?download=1",
        )
        for reference in references:
            with self.subTest(reference=reference):
                user = self.user()
                library = self.library_upload(user)
                own_file = self.upload_root / "media_library" / library.stored_name
                agenda = agendas.create_agenda(AgendaCreate(title="Untrusted cover", cover_image_url=reference), self.db, user)
                user_id, agenda_id = user.id, agenda.id
                self.delete(user)
                self.assertIsNone(self.db.scalar(select(User.id).where(User.id == user_id)))
                self.assertIsNone(self.db.scalar(select(Agenda.id).where(Agenda.id == agenda_id)))
                self.assertFalse(own_file.exists())
                self.assertEqual(sentinel.read_bytes(), PNG)
                self.assertEqual(outside.read_bytes(), PNG)

    def test_profile_links_and_stored_names_cannot_normalize_into_another_category(self):
        user = self.user()
        sentinel = self.upload_root / "media_library" / "unowned.png"
        sentinel.write_bytes(PNG)
        for reference in (
            "/uploads/media_library/unowned.png",
            "/uploads/profile/../media_library/unowned.png",
            "/uploads/profile/..\\media_library\\unowned.png",
        ):
            with self.subTest(reference=reference):
                user.profile_photo_url = reference
                user.profile_cover_url = reference
                self.db.commit()
                self.assertNotIn(sentinel.resolve(), profile._collect_user_upload_paths(self.db, user))
        for name in ("../unowned.png", "nested/unowned.png", "..\\unowned.png", "unowned.png:stream", "unowned.png.", "unowned.png ", ".", "..", "bad\x00.png"):
            with self.subTest(stored_name=name):
                self.assertIsNone(profile._safe_upload_path(self.upload_root / "media_library", name))
        self.delete(user)
        self.assertEqual(sentinel.read_bytes(), PNG)

    def test_wrong_password_keeps_account_and_upload(self):
        user = self.user()
        library = self.library_upload(user)
        path = self.upload_root / "media_library" / library.stored_name
        with self.assertRaises(HTTPException) as caught:
            self.delete(user, password="incorrect-password")
        self.assertEqual(caught.exception.status_code, 400)
        self.assertEqual(path.read_bytes(), PNG)
        self.assertEqual(self.db.scalar(select(User.id).where(User.id == user.id)), user.id)


if __name__ == "__main__":
    unittest.main(verbosity=2)
