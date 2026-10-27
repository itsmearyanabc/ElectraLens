"""OpenTimestamps proofs for publication manifests (B08.11-B08.12, FR-INT-4).

The file stamped is the manifest's RFC 8785 bytes, so the proof's digest *is* the anchored
manifest hash and anyone can check it with the official client:
`ots verify manifest.json.ots` next to `manifest.json`. Calendars are free and need no key;
proofs become complete once Bitcoin confirms them, usually within a few hours. This is the
durable second anchor in case a testnet is retired.
"""

import io
import os
from collections.abc import Callable, Iterator, Sequence
from dataclasses import dataclass
from typing import Any

from opentimestamps.calendar import DEFAULT_CALENDAR_WHITELIST, RemoteCalendar, UrlWhitelist
from opentimestamps.core.notary import BitcoinBlockHeaderAttestation, PendingAttestation
from opentimestamps.core.op import OpAppend, OpSHA256
from opentimestamps.core.serialize import BytesDeserializationContext, BytesSerializationContext
from opentimestamps.core.timestamp import DetachedTimestampFile, Timestamp

DEFAULT_CALENDARS = (
    "https://a.pool.opentimestamps.org",
    "https://b.pool.opentimestamps.org",
    "https://a.pool.eternitywall.com",
    "https://ots.btc.catallaxy.com",
)
CalendarFactory = Callable[[str], Any]


class OtsError(RuntimeError):
    pass


@dataclass(frozen=True)
class ProofStatus:
    digest: str
    """SHA-256 of the stamped bytes, lowercase hex: the manifest hash."""
    complete: bool
    bitcoin_heights: list[int]
    pending_calendars: list[str]


def _serialize(proof: DetachedTimestampFile) -> bytes:
    ctx = BytesSerializationContext()
    proof.serialize(ctx)
    return ctx.getbytes()


def _deserialize(data: bytes) -> DetachedTimestampFile:
    try:
        return DetachedTimestampFile.deserialize(BytesDeserializationContext(data))
    except Exception as error:
        raise OtsError(f"not an OpenTimestamps proof: {type(error).__name__}") from None


def _nodes(timestamp: Timestamp) -> Iterator[Timestamp]:
    yield timestamp
    for child in timestamp.ops.values():
        yield from _nodes(child)


def status(proof: bytes | DetachedTimestampFile) -> ProofStatus:
    detached = _deserialize(proof) if isinstance(proof, bytes) else proof
    heights, pending = set(), set()
    for _msg, attestation in detached.timestamp.all_attestations():
        if isinstance(attestation, BitcoinBlockHeaderAttestation):
            heights.add(attestation.height)
        elif isinstance(attestation, PendingAttestation):
            pending.add(attestation.uri)
    return ProofStatus(
        digest=detached.file_digest.hex(),
        complete=bool(heights),
        bitcoin_heights=sorted(heights),
        pending_calendars=sorted(pending),
    )


def stamp(
    data: bytes,
    calendars: Sequence[str] = DEFAULT_CALENDARS,
    min_calendars: int = 2,
    timeout: float = 10.0,
    calendar: CalendarFactory = RemoteCalendar,
) -> bytes:
    """Submits SHA-256(data) to the calendars and returns the (pending) .ots proof."""
    detached = DetachedTimestampFile.from_fd(OpSHA256(), io.BytesIO(data))
    # A random nonce means calendars see a commitment, not the manifest hash itself.
    tip = detached.timestamp.ops.add(OpAppend(os.urandom(16))).ops.add(OpSHA256())
    accepted, failures = 0, []
    for url in calendars:
        try:
            tip.merge(calendar(url).submit(tip.msg, timeout=timeout))
            accepted += 1
        except Exception as error:
            failures.append(f"{url}: {type(error).__name__}")
    if accepted < min_calendars:
        raise OtsError(f"only {accepted} calendar(s) accepted the stamp: {'; '.join(failures)}")
    return _serialize(detached)


def upgrade(
    proof: bytes,
    allowed: UrlWhitelist = DEFAULT_CALENDAR_WHITELIST,
    timeout: float = 10.0,
    calendar: CalendarFactory = RemoteCalendar,
) -> tuple[bytes, ProofStatus]:
    """Asks the calendars for Bitcoin attestations of pending commitments.

    Only allow-listed calendar URLs are contacted: a proof is untrusted input, and its pending
    attestations could otherwise point the worker at any URL (threat T08, SSRF).
    """
    detached = _deserialize(proof)
    for node in list(_nodes(detached.timestamp)):
        for attestation in list(node.attestations):
            if not isinstance(attestation, PendingAttestation) or attestation.uri not in allowed:
                continue
            try:
                node.merge(calendar(attestation.uri).get_timestamp(node.msg, timeout=timeout))
            except Exception:  # noqa: S112 - not confirmed yet or calendar down: retry later
                continue
    return _serialize(detached), status(detached)
