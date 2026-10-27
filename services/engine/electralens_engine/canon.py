"""Canonicalisation `elcanon-1` and dataset commitments. Mirrors packages/canon/src/commit.ts."""

import json
from collections.abc import Iterable, Mapping, Sequence
from dataclasses import dataclass
from typing import Any

import fastjsonschema

from electralens_engine.errors import CanonError
from electralens_engine.hashing import jcs_bytes
from electralens_engine.merkle import leaf_hash, merkle_root
from electralens_engine.normalize import normalize_row
from electralens_engine.schemas import properties, validator

CANON_VERSION = "elcanon-1"
SALT_BYTES = 32


@dataclass(frozen=True)
class Commitment:
    root: str
    """Merkle root, lowercase hex."""
    row_count: int
    canonical_rows: list[bytes]
    """Canonical rows (RFC 8785 JSON, UTF-8), sorted bytewise."""
    leaf_hashes: list[bytes]


def canonical_row(raw: Mapping[str, Any], schema: str) -> bytes:
    """Normalises, validates and serialises one row. Errors carry the field, never the value."""
    row = normalize_row(raw, properties(schema))
    try:
        validator(schema)(row)
    except fastjsonschema.JsonSchemaValueException as error:
        path = getattr(error, "path", None) or []
        field = path[1] if len(path) > 1 else None
        raise CanonError("schema", None if field is None else str(field)) from None
    return jcs_bytes(row)


def _check_salt(salt: bytes) -> None:
    if len(salt) != SALT_BYTES:
        raise CanonError("bad_salt")


def _commit(rows: list[bytes], salt: bytes) -> Commitment:
    leaves = [leaf_hash(salt, row) for row in rows]
    return Commitment(merkle_root(leaves).hex(), len(rows), rows, leaves)


def dataset_commitment(rows: Iterable[Mapping[str, Any]], schema: str, salt: bytes) -> Commitment:
    """Canonicalise each row, sort, then build the salted Merkle tree."""
    _check_salt(salt)
    encoded: list[bytes] = []
    for index, raw in enumerate(rows):
        try:
            encoded.append(canonical_row(raw, schema))
        except CanonError as error:
            raise error.at_row(index) from None
    encoded.sort()
    return _commit(encoded, salt)


def _reject_constant(_name: str) -> None:
    raise ValueError("non-standard JSON constant")


def commitment_from_canonical_lines(lines: Sequence[str], schema: str, salt: bytes) -> Commitment:
    """Recomputes the commitment of a published canonical file (one row per line, sorted)."""
    _check_salt(salt)
    encoded: list[bytes] = []
    for index, line in enumerate(lines):
        try:
            parsed = json.loads(line, parse_constant=_reject_constant)
        except ValueError:
            raise CanonError("not_canonical", None, index) from None
        if not isinstance(parsed, dict):
            raise CanonError("not_canonical", None, index)
        try:
            again = canonical_row(parsed, schema)
        except CanonError as error:
            raise error.at_row(index) from None
        data = line.encode("utf-8")
        if again != data:
            raise CanonError("not_canonical", None, index)
        if encoded and encoded[-1] > data:
            raise CanonError("not_sorted", None, index)
        encoded.append(data)
    return _commit(encoded, salt)
