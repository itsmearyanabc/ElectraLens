import hashlib
import os
from typing import ClassVar

import pytest
from opentimestamps.core.notary import BitcoinBlockHeaderAttestation, PendingAttestation
from opentimestamps.core.op import OpSHA256
from opentimestamps.core.timestamp import DetachedTimestampFile, Timestamp

from electralens_engine.hashing import jcs_bytes
from electralens_engine.manifest import manifest_hash
from electralens_engine.ots import DEFAULT_CALENDARS, OtsError, _serialize, stamp, status, upgrade
from electralens_engine.vectors import build_vectors

CALENDAR_URI = "https://alice.btc.calendar.opentimestamps.org"


class FakeCalendar:
    """Behaves like a calendar: pending on submit, Bitcoin-attested on later lookup."""

    calls: ClassVar[list[str]] = []

    def __init__(self, url: str) -> None:
        self.url = url
        FakeCalendar.calls.append(url)

    def submit(self, digest: bytes, timeout: float | None = None) -> Timestamp:
        ts = Timestamp(digest)
        ts.attestations.add(PendingAttestation(CALENDAR_URI))
        return ts

    def get_timestamp(self, commitment: bytes, timeout: float | None = None) -> Timestamp:
        ts = Timestamp(commitment)
        ts.attestations.add(BitcoinBlockHeaderAttestation(912345))
        return ts


class DownCalendar:
    def __init__(self, url: str) -> None:
        pass

    def submit(self, digest: bytes, timeout: float | None = None) -> Timestamp:
        raise ConnectionError("calendar down")


MANIFEST = build_vectors()["documents"]["manifest"]["doc"]


def test_proof_digest_is_the_manifest_hash() -> None:
    proof = stamp(jcs_bytes(MANIFEST), calendar=FakeCalendar)
    s = status(proof)
    assert s.digest == manifest_hash(MANIFEST)
    assert not s.complete
    assert s.pending_calendars == [CALENDAR_URI]


def test_upgrade_adds_the_bitcoin_attestation() -> None:
    proof = stamp(b"manifest bytes", calendar=FakeCalendar)
    upgraded, s = upgrade(proof, calendar=FakeCalendar)
    assert s.complete and s.bitcoin_heights == [912345]
    assert s.digest == hashlib.sha256(b"manifest bytes").hexdigest()
    assert status(upgraded) == s


def test_stamp_needs_enough_calendars() -> None:
    with pytest.raises(OtsError, match="only 0 calendar"):
        stamp(b"x", calendar=DownCalendar)


def test_upgrade_never_contacts_unlisted_urls() -> None:
    detached = DetachedTimestampFile(OpSHA256(), Timestamp(hashlib.sha256(b"x").digest()))
    detached.timestamp.attestations.add(PendingAttestation("http://169.254.169.254/latest"))
    FakeCalendar.calls = []
    _, s = upgrade(_serialize(detached), calendar=FakeCalendar)
    assert FakeCalendar.calls == []
    assert not s.complete


def test_garbage_is_not_a_proof() -> None:
    with pytest.raises(OtsError):
        status(b"not a proof")


@pytest.mark.skipif(
    os.environ.get("ELECTRALENS_NETWORK_TESTS") != "1", reason="talks to public calendars"
)
def test_real_calendars_accept_a_stamp() -> None:
    proof = stamp(jcs_bytes(MANIFEST), calendars=DEFAULT_CALENDARS)
    assert status(proof).pending_calendars
