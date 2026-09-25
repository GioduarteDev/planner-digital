from copy import deepcopy
from typing import Any


def deep_merge_json(current: dict[str, Any], patch: dict[str, Any]) -> dict[str, Any]:
    """Merge a partial JSON object without dropping unrelated nested settings.

    Lists and scalar values intentionally replace the previous value. A JSON null is
    stored as null; it is not treated as an implicit delete operation.
    """
    merged = deepcopy(current)
    for key, value in patch.items():
        previous = merged.get(key)
        if isinstance(previous, dict) and isinstance(value, dict):
            merged[key] = deep_merge_json(previous, value)
        else:
            merged[key] = deepcopy(value)
    return merged
