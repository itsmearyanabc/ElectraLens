"""Shared canonicalisation test vectors (test-vectors/canon), consumed by pytest and vitest.

Inputs are defined here by hand. Expected outputs are computed by this implementation, and the
TypeScript implementation must reproduce them byte for byte (AC-7). Independent anchors: the
RFC 6962 reference roots in the unit tests, and the explicit same/different-root assertions below.
"""

import json
import unicodedata
from pathlib import Path
from typing import Any

from electralens_engine.canon import canonical_row, dataset_commitment
from electralens_engine.errors import CanonError
from electralens_engine.hashing import hash_document
from electralens_engine.manifest import manifest_hash
from electralens_engine.merkle import inclusion_proof, leaf_hash, merkle_root

SALT = bytes(range(32))


def _nfd(s: str) -> str:
    return unicodedata.normalize("NFD", s)


ROLL_ROWS: list[dict[str, Any]] = [
    {
        "record_key": "A1B2C3D4E5F6G7H8",
        "ac_code": "DEMO-ST01-AC001",
        "part_no": 1,
        "serial_no": 1,
        "name_local": "सीता देवी",
        "name_latin": "Sita Devi",
        "relative_name_local": "राम कुमार",
        "relative_name_latin": "Ram Kumar",
        "relation_type": "H",
        "gender": "F",
        "age": 42,
        "house_no": "12-B",
        "epic_like": "DMA0000001",
        "status": "active",
        "deletion_reason": None,
        "qualifying_date": "2026-01-01",
        "is_synthetic": True,
    },
    {
        "record_key": "J2K3L4M5N6P7Q8R9",
        "ac_code": "DEMO-ST01-AC001",
        "part_no": 1,
        "serial_no": 2,
        # Precomposed nukta letter (U+0958): NFC keeps it decomposed (composition exclusion).
        "name_local": "मोहम्मद इक़बाल",
        "name_latin": "Mohammad Iqbāl",
        "relative_name_local": "अब्दुल रहमान",
        "relative_name_latin": "Abdul Rahman",
        "relation_type": "F",
        "gender": "M",
        "age": 67,
        "house_no": "7",
        "epic_like": "DMA0000002",
        "status": "deleted",
        "deletion_reason": "S",
        "qualifying_date": "2026-01-01",
        "is_synthetic": True,
    },
    {
        "record_key": "S1T2U3V4W5X6Y7Z8",
        "ac_code": "DEMO-ST01-AC001",
        "part_no": 2,
        "serial_no": 1,
        "name_local": "प्रिया शर्मा",
        "name_latin": "Priya Sharma",
        "relative_name_local": "सुरेश शर्मा",
        "relative_name_latin": "Suresh Sharma",
        "relation_type": "F",
        "gender": "F",
        "age": 19,
        "house_no": None,
        "epic_like": None,
        "status": "active",
        "deletion_reason": None,
        "qualifying_date": "2026-01-01",
        "is_synthetic": True,
    },
]


def _csv_like(row: dict[str, Any]) -> dict[str, Any]:
    """The same row as a CSV reader would deliver it: strings, odd spacing, NFD, lowercase codes."""
    out: dict[str, Any] = {}
    for key, value in row.items():
        if value is None:
            out[key] = ""
        elif isinstance(value, bool):
            out[key] = "TRUE" if value else "false"
        elif isinstance(value, int):
            out[key] = f" 0{value} "
        elif key in ("record_key", "ac_code", "epic_like"):
            out[key] = value.lower()
        elif key in ("relation_type", "gender", "status", "deletion_reason"):
            out[key] = f" {value}\t"
        else:
            out[key] = "\u00a0" + _nfd(value).replace(" ", " \u2003 ") + "\n"
    return out


BOOTH_ROWS: list[dict[str, Any]] = [
    {
        "station_code": "DEMO-ST01-AC001-PS001",
        "ac_code": "DEMO-ST01-AC001",
        "parts_served": "2;1",
        "name": {"en": "DEMO Primary School, Room 1", "hi": "डेमो प्राथमिक विद्यालय, कक्ष 1"},
        "address": {"en": "Fictional Road, Kalpitpur", "hi": "काल्पनिक मार्ग, कल्पितपुर"},
        "lat": None,
        "lng": None,
        "accessibility": {
            "ramp": "true",
            "ground_floor": True,
            "drinking_water": True,
            "toilet": "FALSE",
            "wheelchair": False,
        },
        "source_url": "",
        "is_synthetic": True,
    },
    {
        "station_code": "DEMO-ST01-AC001-PS002",
        "ac_code": "DEMO-ST01-AC001",
        "parts_served": [3],
        "name": {"en": "  DEMO Community Hall  "},
        "address": {"en": "Imaginary Lane"},
        "lat": 0.5,
        "lng": "-0.000000",
        "accessibility": {
            "ramp": False,
            "ground_floor": True,
            "drinking_water": False,
            "toilet": True,
            "wheelchair": False,
        },
        "source_url": "https://example.org/demo-booths",
        "is_synthetic": True,
    },
]

ERROR_CASES: list[tuple[str, str, dict[str, Any], str, str | None]] = [
    (
        "unknown field",
        "electoral_roll_v1",
        {**ROLL_ROWS[0], "party": "X"},
        "unknown_field",
        "party",
    ),
    ("bad enum", "electoral_roll_v1", {**ROLL_ROWS[0], "gender": "X"}, "invalid_enum", "gender"),
    (
        "impossible date",
        "electoral_roll_v1",
        {**ROLL_ROWS[0], "qualifying_date": "2026-02-30"},
        "invalid_date",
        "qualifying_date",
    ),
    (
        "fractional integer",
        "electoral_roll_v1",
        {**ROLL_ROWS[0], "age": "42.5"},
        "invalid_integer",
        "age",
    ),
    (
        "unicode digits",
        "electoral_roll_v1",
        {**ROLL_ROWS[0], "age": "४२"},
        "invalid_integer",
        "age",
    ),
    (
        "control character",
        "electoral_roll_v1",
        {**ROLL_ROWS[0], "name_latin": "Sita\u0007"},
        "control_char",
        "name_latin",
    ),
    (
        "astral character",
        "electoral_roll_v1",
        {**ROLL_ROWS[0], "name_latin": "Sita \U0001f600"},
        "unsupported_char",
        "name_latin",
    ),
    (
        "lone surrogate",
        "electoral_roll_v1",
        {**ROLL_ROWS[0], "name_latin": "Sita\ud800"},
        "not_well_formed",
        "name_latin",
    ),
    (
        "blank required",
        "electoral_roll_v1",
        {**ROLL_ROWS[0], "name_latin": " \t "},
        "required",
        "name_latin",
    ),
    (
        "schema pattern",
        "electoral_roll_v1",
        {**ROLL_ROWS[0], "epic_like": "BAD"},
        "schema",
        "epic_like",
    ),
    (
        "schema range",
        "electoral_roll_v1",
        {**ROLL_ROWS[0], "age": 151},
        "schema",
        "age",
    ),
    (
        "decimal precision",
        "polling_stations_v1",
        {**BOOTH_ROWS[0], "lat": "28.1234567"},
        "decimal_scale",
        "lat",
    ),
    (
        "float precision",
        "polling_stations_v1",
        {**BOOTH_ROWS[0], "lat": 0.0078125},
        "decimal_scale",
        "lat",
    ),
    (
        "duplicate list item",
        "polling_stations_v1",
        {**BOOTH_ROWS[0], "parts_served": "1;1"},
        "duplicate_item",
        "parts_served",
    ),
    (
        "bad locale key",
        "polling_stations_v1",
        {**BOOTH_ROWS[0], "name": {"en": "X", "Hindi": "Y"}},
        "invalid_locale",
        "name",
    ),
]

DOCUMENTS: list[tuple[str, Any]] = [
    ("key order", {"b": 1, "a": [True, None, "x"]}),
    ("unicode keys and values", {"नाम": "सीता", "é": "é", "esc": 'q"\\\n\t\u001f'}),
    ("nested", {"z": {"y": [3, 2, {"b": -0, "a": 9007199254740991}]}, "empty": {}}),
]


def _commitment_vector(
    name: str, description: str, schema: str, rows: list[dict[str, Any]], **asserts: str
) -> dict[str, Any]:
    c = dataset_commitment(rows, schema, SALT)
    vector: dict[str, Any] = {
        "kind": "commitment",
        "name": name,
        "description": description,
        "schema": schema,
        "salt": SALT.hex(),
        "rows": rows,
        "expected": {
            "row_count": c.row_count,
            "root": c.root,
            "canonical_rows": [row.decode("utf-8") for row in c.canonical_rows],
            "leaf_hashes": [h.hex() for h in c.leaf_hashes],
        },
    }
    if asserts:
        vector["assert"] = asserts
    return vector


def _error_vector() -> dict[str, Any]:
    cases = []
    for label, schema, row, code, field in ERROR_CASES:
        try:
            canonical_row(row, schema)
        except CanonError as error:
            if (error.code, error.field) != (code, field):
                raise AssertionError(f"{label}: got {error.code}/{error.field}") from None
        else:
            raise AssertionError(f"{label}: expected {code}")
        cases.append(
            {
                "name": label,
                "schema": schema,
                "row": row,
                "expected": {"code": code, "field": field},
            }
        )
    return {"kind": "errors", "name": "errors", "cases": cases}


def _merkle_vector() -> dict[str, Any]:
    data = [f"leaf-{i}".encode() for i in range(7)]
    leaves = [leaf_hash(SALT, d) for d in data]
    return {
        "kind": "merkle",
        "name": "merkle-sizes",
        "salt": SALT.hex(),
        "leaf_data": [d.hex() for d in data],
        "roots": [merkle_root(leaves[:n]).hex() for n in range(len(leaves) + 1)],
        "proofs_size_7": [[p.hex() for p in inclusion_proof(i, leaves)] for i in range(7)],
    }


def _documents_vector(roll_root: str) -> dict[str, Any]:
    manifest = {
        "schema": "electralens.manifest.v1",
        "series_id": "DEMO-ST01-AC001",
        "sequence": 1,
        "previous_manifest_hash": None,
        "is_synthetic": True,
        "datasets": [
            {
                "role": "baseline",
                "version_id": "6f1c9a52-6b1e-4c3e-9a51-0e6b2f4d7a10",
                "root": roll_root,
                "row_count": 3,
                "schema": "electoral_roll_v1",
                "canon": "elcanon-1",
            }
        ],
        "audit_run": None,
        "report_hash": None,
        "aggregates_hash": None,
        "published_at": "2026-11-02T10:15:00Z",
        "publisher": "ElectraLens (independent, not affiliated with ECI)",
    }
    return {
        "kind": "documents",
        "name": "documents",
        "cases": [
            {"name": label, "doc": doc, "hash": hash_document(doc)} for label, doc in DOCUMENTS
        ],
        "manifest": {"doc": manifest, "hash": manifest_hash(manifest)},
    }


def build_vectors() -> dict[str, dict[str, Any]]:
    basic = _commitment_vector(
        "roll-basic",
        "Three typed rows: Devanagari, a nukta letter, a deletion, nulls.",
        "electoral_roll_v1",
        ROLL_ROWS,
    )
    vectors = [
        basic,
        _commitment_vector(
            "roll-csv-strings",
            "The same rows as CSV strings with NFD text, odd whitespace and lowercase codes.",
            "electoral_roll_v1",
            [_csv_like(r) for r in ROLL_ROWS],
            same_root_as="roll-basic",
        ),
        _commitment_vector(
            "roll-shuffled",
            "The same rows in a different order.",
            "electoral_roll_v1",
            list(reversed(ROLL_ROWS)),
            same_root_as="roll-basic",
        ),
        _commitment_vector(
            "roll-duplicate-row",
            "A repeated row is counted twice.",
            "electoral_roll_v1",
            [*ROLL_ROWS, ROLL_ROWS[0]],
            different_root_from="roll-basic",
        ),
        _commitment_vector(
            "roll-one-char-change",
            "One character changed in one name.",
            "electoral_roll_v1",
            [ROLL_ROWS[0], {**ROLL_ROWS[1], "name_latin": "Mohammad Iqbāi"}, ROLL_ROWS[2]],
            different_root_from="roll-basic",
        ),
        _commitment_vector("roll-empty", "No rows.", "electoral_roll_v1", []),
        _commitment_vector(
            "booths-basic",
            "Translations, unsorted part lists, decimals and flags.",
            "polling_stations_v1",
            BOOTH_ROWS,
        ),
        _error_vector(),
        _merkle_vector(),
        _documents_vector(basic["expected"]["root"]),
    ]
    return {v["name"]: v for v in vectors}


def _dump(vector: dict[str, Any]) -> str:
    # ASCII escapes keep NFD sequences and control characters intact through any editor or tool.
    return json.dumps(vector, ensure_ascii=True, indent=2) + "\n"


def _all_vectors(directory: Path) -> dict[Path, dict[str, Any]]:
    """Canonicalisation vectors in `directory`; rendering vectors in its sibling `i18n`."""
    from electralens_engine.explain.render import render_vectors

    files = {directory / f"{name}.json": vector for name, vector in build_vectors().items()}
    files[directory.parent / "i18n" / "render.json"] = render_vectors()
    return files


def write_vectors(directory: Path) -> list[Path]:
    written = []
    for path, vector in _all_vectors(directory).items():
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(_dump(vector), encoding="utf-8", newline="\n")
        written.append(path)
    return written


def stale_vectors(directory: Path) -> list[str]:
    """Vector files that are missing or differ from what this implementation computes."""
    return [
        path.name
        for path, vector in _all_vectors(directory).items()
        if not path.is_file() or path.read_text(encoding="utf-8") != _dump(vector)
    ]
