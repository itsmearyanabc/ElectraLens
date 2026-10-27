"""Versioned methodology parameters. A version is frozen once any run uses it (T20)."""

import json
from decimal import Decimal
from functools import cache
from pathlib import Path
from typing import Any

from electralens_engine.hashing import hash_document

_DIR = Path(__file__).parent


@cache
def load_methodology(version: str) -> dict[str, Any]:
    path = _DIR / f"{version}.json"
    if not path.is_file():
        raise ValueError(f"unknown methodology version {version!r}")
    with path.open(encoding="utf-8") as f:
        return json.load(f)


def params_hash(version: str) -> str:
    """Hash of the exact parameters, recorded with every run (FR-AUD-6)."""
    return hash_document(load_methodology(version))


def number(value: str | int) -> float:
    """Decimal strings in the methodology are exact; convert only at the point of use."""
    return float(Decimal(str(value)))
