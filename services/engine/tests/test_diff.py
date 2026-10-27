from typing import Any

from electralens_engine.analysis.aggregates import part_table
from electralens_engine.analysis.diff import compare
from electralens_engine.analysis.load import from_commitment
from electralens_engine.canon import dataset_commitment

SALT = bytes(32)


def _row(key: str, part: int, age: int, **extra: Any) -> dict[str, Any]:
    row = {
        "record_key": key.ljust(16, "0"),
        "ac_code": "DEMO-HR-AC901",
        "part_no": part,
        "serial_no": 1,
        "name_local": "सीता देवी",
        "name_latin": "Sita Devi",
        "relative_name_local": "राम कुमार",
        "relative_name_latin": "Ram Kumar",
        "relation_type": "H",
        "gender": "F",
        "age": age,
        "house_no": "1",
        "epic_like": None,
        "status": "active",
        "deletion_reason": None,
        "qualifying_date": "2026-01-01",
        "is_synthetic": True,
    }
    return row | extra


def _version(rows: list[dict[str, Any]]):
    return from_commitment(dataset_commitment(rows, "electoral_roll_v1", SALT))


def test_every_kind_of_change() -> None:
    v1 = _version(
        [_row("A", 1, 40), _row("B", 1, 50), _row("C", 1, 60), _row("D", 1, 30), _row("E", 1, 70)]
    )
    v2 = _version(
        [
            _row("A", 1, 41, qualifying_date="2027-01-01"),  # continuing
            _row("B", 1, 51, status="deleted", deletion_reason="S", qualifying_date="2027-01-01"),
            # C is gone with no deletion entry
            _row("D", 2, 31, qualifying_date="2027-01-01"),  # moved to part 2
            _row("E", 1, 71, name_latin="Seeta Devi", qualifying_date="2027-01-01"),  # corrected
            _row("F", 1, 18, qualifying_date="2027-01-01"),  # new first-time voter
        ]
    )
    diff = compare(v1, v2)
    assert diff.elapsed_years == 1.0
    kinds = {(r["record_key"][0], r["change"]) for r in diff.changes.iter_rows(named=True)}
    assert kinds == {
        ("A", "continuing"),
        ("B", "deletion"),
        ("C", "deletion"),
        ("D", "continuing"),  # still checked for corrections and age changes after moving
        ("D", "transfer_out"),
        ("D", "transfer_in"),
        ("E", "continuing"),
        ("F", "addition"),
    }
    reasons = {
        r["record_key"][0]: r["reason"]
        for r in diff.changes.iter_rows(named=True)
        if r["change"] == "deletion"
    }
    assert reasons == {"B": "S", "C": "unrecorded"}
    corrected = {
        r["record_key"][0]: r["corrected_fields"]
        for r in diff.changes.iter_rows(named=True)
        if r["change"] == "continuing"
    }
    assert corrected == {"A": [], "D": [], "E": ["name_latin"]}

    parts = {r["part_no"]: r for r in part_table(v1, v2, diff).parts.iter_rows(named=True)}
    # The move is a transfer, never a deletion plus an addition.
    assert parts[1]["deletions"] == 2 and parts[1]["transfers_out"] == 1
    assert parts[2]["transfers_in"] == 1 and parts[2]["additions"] == 0
    assert parts[1]["additions_18_19"] == 1
    assert parts[1]["deletions_unrecorded"] == 1


def test_quarterly_qualifying_dates() -> None:
    v1 = _version([_row("A", 1, 40)])
    v2 = _version([_row("A", 1, 40, qualifying_date="2026-04-01")])
    assert compare(v1, v2).elapsed_years == 0.25
