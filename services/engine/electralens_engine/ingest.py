"""Ingestion: validate an uploaded roll or booth list and commit to it (B03.03 to B03.10).

The report counts problems by type and lists row numbers and field names, never values, so it
can be shown to staff without exposing anyone's details (FR-ING-4). The worker and `el ingest`
run exactly this code.
"""

import gzip
from collections import Counter
from collections.abc import Iterable, Mapping
from dataclasses import dataclass
from typing import Any

from electralens_engine.canon import Commitment, _commit, canonical_row
from electralens_engine.errors import CanonError
from electralens_engine.schemas import classification, properties

MAX_LISTED_ERRORS = 200
SCOPED_FIELD = "ac_code"


@dataclass(frozen=True)
class IngestResult:
    valid: bool
    report: dict[str, Any]
    commitment: Commitment | None


def ingest_rows(
    rows: Iterable[Mapping[str, Any]], schema: str, salt: bytes, scope_code: str | None = None
) -> IngestResult:
    allowed = set(properties(schema))
    encoded: list[bytes] = []
    errors: list[dict[str, Any]] = []
    counts: Counter[str] = Counter()
    unknown: set[str] = set()
    total = 0

    def problem(row: int, code: str, field: str | None) -> None:
        counts[code] += 1
        if len(errors) < MAX_LISTED_ERRORS:
            errors.append({"row": row, "code": code, "field": field})

    for index, raw in enumerate(rows):
        total += 1
        row_number = index + 2  # the header is line 1
        extra = set(raw) - allowed
        if extra:
            # B03.10 / NFR-3: unknown columns are refused, so party or vote data can't enter.
            unknown |= extra
            problem(row_number, "unknown_column", sorted(extra)[0])
            continue
        code = raw.get(SCOPED_FIELD)
        if (
            scope_code
            and isinstance(code, str)
            and not (code == scope_code or code.startswith(f"{scope_code}-"))
        ):
            problem(row_number, "outside_scope", SCOPED_FIELD)
            continue
        try:
            encoded.append(canonical_row(raw, schema))
        except CanonError as error:
            problem(row_number, error.code, error.field)

    if total == 0:
        problem(1, "empty_file", None)

    report: dict[str, Any] = {
        "schema": schema,
        "rows_read": total,
        "rows_valid": len(encoded),
        "error_counts": dict(sorted(counts.items())),
        "errors": errors,
        "errors_listed": len(errors),
        "unknown_columns": sorted(unknown),
        "column_classification": classification(schema),
    }
    if counts:
        return IngestResult(False, report, None)
    encoded.sort()
    commitment = _commit(encoded, salt)
    report["root"] = commitment.root
    return IngestResult(True, report, commitment)


def canonical_file(commitment: Commitment) -> bytes:
    """Canonical rows as gzipped JSON lines: exactly the bytes the Merkle root commits to."""
    return gzip.compress(b"\n".join(commitment.canonical_rows), mtime=0)


def read_canonical_file(data: bytes) -> list[bytes]:
    raw = gzip.decompress(data)
    return raw.split(b"\n") if raw else []
