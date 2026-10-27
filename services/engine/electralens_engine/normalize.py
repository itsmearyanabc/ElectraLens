"""Field normalisation for canonicalisation `elcanon-1`.

Mirrors packages/canon/src/normalize.ts rule for rule; the shared test vectors keep them equal.
Each field's behaviour comes from the `x-canon` annotation in the JSON Schema.
"""

import itertools
import math
import re
import unicodedata
from collections.abc import Mapping
from typing import Any

from electralens_engine.errors import CanonError

# The same explicit whitespace set as the TypeScript side (Python's \s differs from JavaScript's).
_WS = "\t\n\v\f\r \u00a0\u1680\u2000-\u200a\u2028\u2029\u202f\u205f\u3000\ufeff"
_WS_RUN = re.compile(f"[{_WS}]+")
_WS_EDGES = re.compile(f"\\A[{_WS}]+|[{_WS}]+\\Z")
_CONTROL = re.compile("[\x00-\x08\x0e-\x1f\x7f-\x9f]")
_INTEGER = re.compile(r"-?[0-9]+")
_DATE = re.compile(r"([0-9]{4})-([0-9]{2})-([0-9]{2})")
_DECIMAL = re.compile(r"(-?)([0-9]+)(?:\.([0-9]+))?")
_LOCALE = re.compile(r"[a-z]{2,3}")
_ASCII_UPPER = str.maketrans("abcdefghijklmnopqrstuvwxyz", "ABCDEFGHIJKLMNOPQRSTUVWXYZ")
_MAX_SAFE = 2**53 - 1

Json = None | bool | int | str | list[Any] | dict[str, Any]


def _trim(s: str) -> str:
    return _WS_EDGES.sub("", s)


def _well_formed(value: str, field: str) -> str:
    try:
        value.encode("utf-8")
    except UnicodeEncodeError:
        raise CanonError("not_well_formed", field) from None
    return value


def _blank(raw: Any) -> bool:
    return raw is None or (isinstance(raw, str) and _trim(raw) == "")


def _text(raw: Any, field: str) -> str:
    if not isinstance(raw, str):
        raise CanonError("type", field)
    value = _trim(_WS_RUN.sub(" ", unicodedata.normalize("NFC", _well_formed(raw, field))))
    if _CONTROL.search(value):
        raise CanonError("control_char", field)
    if any(ord(c) > 0xFFFF for c in value):
        raise CanonError("unsupported_char", field)
    return value


def _code(raw: Any, field: str) -> str:
    if not isinstance(raw, str):
        raise CanonError("type", field)
    return _trim(_well_formed(raw, field)).translate(_ASCII_UPPER)


def _enum(raw: Any, field: str, allowed: list[str]) -> str:
    if not isinstance(raw, str):
        raise CanonError("type", field)
    value = _trim(_well_formed(raw, field))
    if value not in allowed:
        raise CanonError("invalid_enum", field)
    return value


def _integer(raw: Any, field: str) -> int:
    if isinstance(raw, bool):
        raise CanonError("type", field)
    if isinstance(raw, int):
        value = raw
    elif isinstance(raw, float):
        if not math.isfinite(raw) or not raw.is_integer():
            raise CanonError("invalid_integer", field)
        value = int(raw)
    elif isinstance(raw, str):
        s = _trim(raw)
        if not _INTEGER.fullmatch(s):
            raise CanonError("invalid_integer", field)
        value = int(s)
    else:
        raise CanonError("type", field)
    if abs(value) > _MAX_SAFE:
        raise CanonError("invalid_integer", field)
    return value


def _boolean(raw: Any, field: str) -> bool:
    if isinstance(raw, bool):
        return raw
    if isinstance(raw, str):
        s = _trim(raw).lower()
        if s == "true":
            return True
        if s == "false":
            return False
    raise CanonError("type", field)


def _date(raw: Any, field: str) -> str:
    if not isinstance(raw, str):
        raise CanonError("type", field)
    s = _trim(raw)
    m = _DATE.fullmatch(s)
    if not m:
        raise CanonError("invalid_date", field)
    year, month, day = (int(g) for g in m.groups())
    leap = (year % 4 == 0 and year % 100 != 0) or year % 400 == 0
    days = [31, 29 if leap else 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
    if year < 1000 or not 1 <= month <= 12 or not 1 <= day <= days[month - 1]:
        raise CanonError("invalid_date", field)
    return s


def _decimal(raw: Any, field: str, scale: int) -> str:
    if isinstance(raw, bool):
        raise CanonError("type", field)
    if isinstance(raw, int | float):
        # Same rule as TypeScript: format at the target scale and require an exact round trip.
        if not math.isfinite(raw) or abs(raw) >= 1e15:
            raise CanonError("type", field)
        s = f"{raw:.{scale}f}" if isinstance(raw, float) else str(raw)
        if isinstance(raw, float) and float(s) != raw:
            raise CanonError("decimal_scale", field)
    elif isinstance(raw, str):
        s = _trim(raw)
    else:
        raise CanonError("type", field)
    m = _DECIMAL.fullmatch(s)
    if not m:
        raise CanonError("type", field)
    sign, int_part, frac = m.group(1), m.group(2).lstrip("0") or "0", m.group(3) or ""
    if len(frac) > scale:
        raise CanonError("decimal_scale", field)
    digits = f"{int_part}.{frac.ljust(scale, '0')}"
    is_zero = set(digits) <= {"0", "."}
    return f"-{digits}" if sign == "-" and not is_zero else digits


def _int_list(raw: Any, field: str) -> list[int]:
    if isinstance(raw, str):
        items: list[Any] = _trim(raw).split(";")  # CSV form: "3;1;2"
    elif isinstance(raw, list | tuple):
        items = list(raw)
    else:
        raise CanonError("type", field)
    values = sorted(_integer(item, field) for item in items)
    if any(a == b for a, b in itertools.pairwise(values)):
        raise CanonError("duplicate_item", field)
    return values


def _locale_text(raw: Any, field: str) -> dict[str, str]:
    if not isinstance(raw, Mapping):
        raise CanonError("type", field)
    out: dict[str, str] = {}
    for locale, value in raw.items():
        if not isinstance(locale, str) or not _LOCALE.fullmatch(locale):
            raise CanonError("invalid_locale", field)
        normalized = "" if _blank(value) else _text(value, field)
        if normalized == "":
            raise CanonError("required", f"{field}.{locale}")
        out[locale] = normalized
    return out


def _flags(raw: Any, field: str) -> dict[str, bool]:
    if not isinstance(raw, Mapping):
        raise CanonError("type", field)
    return {str(key): _boolean(value, f"{field}.{key}") for key, value in raw.items()}


def _enum_values(prop: Mapping[str, Any]) -> list[str]:
    if "enum" in prop:
        return list(prop["enum"])
    for option in prop.get("anyOf", []):
        if "enum" in option:
            return list(option["enum"])
    return []


def normalize_value(raw: Any, prop: Mapping[str, Any], field: str) -> Json:
    spec = prop["x-canon"]
    if _blank(raw):
        if not spec["nullable"]:
            raise CanonError("required", field)
        return None
    kind = spec["kind"]
    match kind:
        case "text":
            value = _text(raw, field)
            if value == "":
                raise CanonError("required", field)
            return value
        case "code":
            return _code(raw, field)
        case "enum":
            return _enum(raw, field, _enum_values(prop))
        case "integer":
            return _integer(raw, field)
        case "boolean":
            return _boolean(raw, field)
        case "date":
            return _date(raw, field)
        case "decimal":
            return _decimal(raw, field, spec.get("scale", 6))
        case "int_list":
            return _int_list(raw, field)
        case "locale_text":
            return _locale_text(raw, field)
        case "flags":
            return _flags(raw, field)
    raise ValueError(f"unknown canon kind {kind!r}")


def normalize_row(raw: Mapping[str, Any], properties: Mapping[str, Mapping[str, Any]]) -> dict:
    """Canonical object for one row: every schema property present, missing optionals null."""
    for key in raw:
        if key not in properties:
            raise CanonError("unknown_field", str(key))
    return {name: normalize_value(raw.get(name), prop, name) for name, prop in properties.items()}
