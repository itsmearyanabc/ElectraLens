"""RFC 8785 canonical JSON and document hashing. Mirrors packages/canon/src/jcs.ts and hash.ts."""

import hashlib
from typing import Any

import rfc8785

from electralens_engine.errors import CanonError

_MAX_SAFE = 2**53 - 1


def _assert_hashable(value: Any, path: str) -> None:
    """Hashed documents may not contain binary floats: decimals must be fixed-scale strings."""
    if value is None or isinstance(value, bool):
        return
    if isinstance(value, int):
        if abs(value) > _MAX_SAFE:
            raise CanonError("float_not_allowed", path)
    elif isinstance(value, float):
        raise CanonError("float_not_allowed", path)
    elif isinstance(value, str):
        try:
            value.encode("utf-8")
        except UnicodeEncodeError:
            raise CanonError("not_well_formed", path) from None
    elif isinstance(value, list | tuple):
        for i, item in enumerate(value):
            _assert_hashable(item, f"{path}[{i}]")
    elif isinstance(value, dict):
        for key, item in value.items():
            if not isinstance(key, str):
                raise CanonError("type", path)
            _assert_hashable(item, f"{path}.{key}")
    else:
        raise CanonError("type", path)


def jcs_bytes(value: Any) -> bytes:
    _assert_hashable(value, "$")
    return rfc8785.dumps(value)


def jcs(value: Any) -> str:
    return jcs_bytes(value).decode("utf-8")


def hash_document(doc: Any) -> str:
    """SHA-256 of the document's RFC 8785 form, as lowercase hex."""
    return hashlib.sha256(jcs_bytes(doc)).hexdigest()
