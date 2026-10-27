"""CSV reading and writing for dataset files.

Nested fields are flattened with dots (`name.en`, `accessibility.ramp`) and lists are joined
with `;`. Reading reverses that; empty nested cells are dropped so an untranslated locale is
simply absent.
"""

import csv
from collections.abc import Iterable, Iterator, Mapping, Sequence
from pathlib import Path
from typing import Any


def _cell(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, bool):
        return "true" if value else "false"
    if isinstance(value, list | tuple):
        return ";".join(str(item) for item in value)
    return str(value)


def flatten(row: Mapping[str, Any]) -> dict[str, Any]:
    out: dict[str, Any] = {}
    for key, value in row.items():
        if isinstance(value, Mapping):
            for sub_key, sub_value in value.items():
                out[f"{key}.{sub_key}"] = sub_value
        else:
            out[key] = value
    return out


def unflatten(row: Mapping[str, str]) -> dict[str, Any]:
    out: dict[str, Any] = {}
    for key, value in row.items():
        if "." in key:
            parent, child = key.split(".", 1)
            nested = out.setdefault(parent, {})
            if value != "":
                nested[child] = value
        else:
            out[key] = value
    return out


def write_rows(path: Path, columns: Sequence[str], rows: Iterable[Mapping[str, Any]]) -> None:
    """UTF-8, LF line endings, no BOM: identical bytes on every platform."""
    with path.open("w", encoding="utf-8", newline="") as f:
        writer = csv.writer(f, lineterminator="\n")
        writer.writerow(columns)
        for row in rows:
            flat = flatten(row)
            writer.writerow([_cell(flat.get(column)) for column in columns])


def read_rows(path: Path) -> Iterator[dict[str, Any]]:
    with path.open(encoding="utf-8", newline="") as f:
        for row in csv.DictReader(f):
            yield unflatten(row)
