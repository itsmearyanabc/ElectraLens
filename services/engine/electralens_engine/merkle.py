"""RFC 6962 Merkle Tree Hash with domain-separated leaves (0x00) and nodes (0x01).

Dataset leaves also carry a per-dataset salt; with an empty salt this is plain RFC 6962.
Mirrors packages/canon/src/merkle.ts.
"""

import hashlib
import hmac
from collections.abc import Sequence

_LEAF = b"\x00"
_NODE = b"\x01"


def sha256(data: bytes) -> bytes:
    return hashlib.sha256(data).digest()


def leaf_hash(salt: bytes, data: bytes) -> bytes:
    return sha256(_LEAF + salt + data)


def node_hash(left: bytes, right: bytes) -> bytes:
    return sha256(_NODE + left + right)


def _split(n: int) -> int:
    """Largest power of two strictly smaller than n (n >= 2)."""
    k = 1
    while k * 2 < n:
        k *= 2
    return k


def _subtree_root(leaves: Sequence[bytes], start: int, end: int) -> bytes:
    if end - start == 1:
        return leaves[start]
    k = _split(end - start)
    return node_hash(_subtree_root(leaves, start, start + k), _subtree_root(leaves, start + k, end))


def merkle_root(leaves: Sequence[bytes]) -> bytes:
    """Root over already-hashed leaves. The empty tree's root is SHA-256 of the empty string."""
    if not leaves:
        return sha256(b"")
    return _subtree_root(leaves, 0, len(leaves))


def inclusion_proof(index: int, leaves: Sequence[bytes]) -> list[bytes]:
    """Audit path for leaf `index` (RFC 6962 §2.1.1)."""
    if not 0 <= index < len(leaves):
        raise IndexError("leaf index out of range")

    def path(m: int, start: int, end: int) -> list[bytes]:
        if end - start == 1:
            return []
        k = _split(end - start)
        if m < k:
            return [*path(m, start, start + k), _subtree_root(leaves, start + k, end)]
        return [*path(m - k, start + k, end), _subtree_root(leaves, start, start + k)]

    return path(index, 0, len(leaves))


def verify_inclusion(
    leaf: bytes, index: int, tree_size: int, proof: Sequence[bytes], root: bytes
) -> bool:
    """Verifies an audit path (RFC 9162 §2.1.3.2)."""
    if not 0 <= index < tree_size:
        return False
    fn, sn, r = index, tree_size - 1, leaf
    for p in proof:
        if sn == 0:
            return False
        if fn & 1 or fn == sn:
            r = node_hash(p, r)
            while not fn & 1 and fn != 0:
                fn >>= 1
                sn >>= 1
        else:
            r = node_hash(r, p)
        fn >>= 1
        sn >>= 1
    return sn == 0 and hmac.compare_digest(r, root)
