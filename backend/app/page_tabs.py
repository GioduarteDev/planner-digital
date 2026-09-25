from copy import deepcopy
import re
from typing import Any

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Folder, Page


TARGET_PATTERN = re.compile(r"^(page|section):(\d+)$")
COLOR_PATTERN = re.compile(r"^#[0-9a-fA-F]{6}$")


def validate_page_tabs(settings: dict[str, Any], agenda_id: int, db: Session) -> None:
    if "page_tabs_v1" not in settings:
        return
    tabs = settings["page_tabs_v1"]
    if not isinstance(tabs, list) or len(tabs) > 24:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Marcadores inválidos.")

    page_ids = set(db.scalars(select(Page.id).where(Page.agenda_id == agenda_id)).all())
    folder_ids = set(db.scalars(select(Folder.id).where(Folder.agenda_id == agenda_id)).all())
    seen_ids: set[str] = set()
    seen_orders: set[int] = set()
    for tab in tabs:
        if not isinstance(tab, dict):
            raise HTTPException(status_code=400, detail="Marcador inválido.")
        tab_id = tab.get("id")
        label = tab.get("label")
        color = tab.get("color")
        target = tab.get("target")
        order = tab.get("order")
        side = tab.get("side")
        match = TARGET_PATTERN.fullmatch(target) if isinstance(target, str) else None
        if (
            not isinstance(tab_id, str) or not 1 <= len(tab_id) <= 100
            or tab_id in seen_ids
            or not isinstance(label, str) or not 1 <= len(label.strip()) <= 18
            or not isinstance(color, str) or COLOR_PATTERN.fullmatch(color) is None
            or not isinstance(order, int) or isinstance(order, bool) or order < 0
            or order in seen_orders
            or match is None
            or side not in (None, "left", "right")
        ):
            raise HTTPException(status_code=400, detail="Marcador inválido.")
        kind, raw_id = match.groups()
        target_id = int(raw_id)
        if (kind == "page" and target_id not in page_ids) or (
            kind == "section" and target_id not in folder_ids
        ):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="O destino do marcador precisa pertencer à mesma agenda.",
            )
        seen_ids.add(tab_id)
        seen_orders.add(order)


def prune_page_tab_target(settings: dict[str, Any], target: str) -> dict[str, Any]:
    updated = deepcopy(settings)
    tabs = updated.get("page_tabs_v1")
    if isinstance(tabs, list):
        kept = [tab for tab in tabs if not isinstance(tab, dict) or tab.get("target") != target]
        for order, tab in enumerate(kept):
            if isinstance(tab, dict):
                tab["order"] = order
        updated["page_tabs_v1"] = kept
    return updated


def remap_page_tabs(
    settings: dict[str, Any], page_map: dict[int, int], folder_map: dict[int, int]
) -> dict[str, Any]:
    updated = deepcopy(settings)
    tabs = updated.get("page_tabs_v1")
    if not isinstance(tabs, list):
        return updated
    remapped: list[dict[str, Any]] = []
    for tab in tabs:
        if not isinstance(tab, dict) or not isinstance(tab.get("target"), str):
            continue
        match = TARGET_PATTERN.fullmatch(tab["target"])
        if match is None:
            continue
        kind, raw_id = match.groups()
        mapping = page_map if kind == "page" else folder_map
        new_id = mapping.get(int(raw_id))
        if new_id is None:
            continue
        copy = deepcopy(tab)
        copy["target"] = f"{kind}:{new_id}"
        copy["order"] = len(remapped)
        remapped.append(copy)
    updated["page_tabs_v1"] = remapped
    return updated
