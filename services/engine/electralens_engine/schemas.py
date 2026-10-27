"""Access to the shared JSON Schemas generated from packages/schemas."""

import json
from collections.abc import Callable, Mapping
from functools import cache
from typing import Any

import fastjsonschema

from electralens_engine.paths import schema_dir

DATASET_SCHEMAS = ("electoral_roll_v1", "polling_stations_v1")

# Formats zod emits that draft-07 doesn't define. Their `pattern` already enforces the shape.
_EXTRA_FORMATS: dict[str, Callable[[str], bool]] = {"uuid": lambda _value: True}


@cache
def load_schema(name: str) -> dict[str, Any]:
    with (schema_dir() / f"{name}.schema.json").open(encoding="utf-8") as f:
        return json.load(f)


@cache
def validator(name: str) -> Callable[[Any], Any]:
    return fastjsonschema.compile(load_schema(name), formats=_EXTRA_FORMATS)


def properties(name: str) -> Mapping[str, Mapping[str, Any]]:
    return load_schema(name)["properties"]


def classification(name: str) -> dict[str, str]:
    """Privacy class of each field: direct, quasi or none (FR-ING-5)."""
    return {field: prop["x-classification"] for field, prop in properties(name).items()}
