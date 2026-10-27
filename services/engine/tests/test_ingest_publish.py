from pathlib import Path

import pytest

from electralens_engine.canon import dataset_commitment
from electralens_engine.csv_io import read_rows
from electralens_engine.generator import GeneratorConfig, generate
from electralens_engine.ingest import canonical_file, ingest_rows, read_canonical_file
from electralens_engine.publish import published_aggregates, suppress
from electralens_engine.worker.jobs import JobError, _scan_for_personal_data

SALT = b"\x01" * 32


@pytest.fixture(scope="module")
def roll(tmp_path_factory: pytest.TempPathFactory) -> Path:
    """The smallest synthetic roll the generator allows (about 3,000 rows)."""
    out = tmp_path_factory.mktemp("roll")
    generate(
        GeneratorConfig(
            seed=3,
            state="HR",
            acs=1,
            parts_min=30,
            parts_max=30,
            electors_min=100,
            electors_max=110,
        ),
        out,
    )
    return out / "roll_v1.csv"


def _first(path: Path, n: int) -> list[dict]:
    rows = []
    for row in read_rows(path):
        rows.append(row)
        if len(rows) == n:
            break
    return rows


def test_valid_rows_commit_to_the_same_root_as_the_canon(roll: Path) -> None:
    rows = list(read_rows(roll))
    result = ingest_rows(rows, "electoral_roll_v1", SALT, "DEMO-HR")
    assert result.valid and result.commitment is not None
    assert result.commitment.root == dataset_commitment(rows, "electoral_roll_v1", SALT).root
    assert (
        read_canonical_file(canonical_file(result.commitment)) == result.commitment.canonical_rows
    )


def test_unknown_columns_are_refused_and_never_echoed(roll: Path) -> None:
    rows = _first(roll, 3)
    rows[1] = {**rows[1], "party": "SECRET VALUE"}
    result = ingest_rows(rows, "electoral_roll_v1", SALT)
    assert not result.valid
    assert result.report["unknown_columns"] == ["party"]
    assert "SECRET VALUE" not in repr(result.report)


def test_rows_outside_the_version_area_are_refused(roll: Path) -> None:
    result = ingest_rows(_first(roll, 3), "electoral_roll_v1", SALT, "DEMO-RJ")
    assert not result.valid
    assert result.report["error_counts"] == {"outside_scope": 3}


def test_small_counts_are_suppressed_but_zero_and_net_change_are_not() -> None:
    assert suppress({"metric": "deletions", "value": 7}) == (None, True)
    assert suppress({"metric": "deletions", "value": 0}) == (0, False)
    assert suppress({"metric": "net_change", "value": -3}) == (-3, False)
    rows = published_aggregates(
        [{"area_code": "A", "level": "part", "metric": "additions", "dims": {}, "value": 12}]
    )
    assert rows[0]["value"] == 12 and rows[0]["suppressed"] is False


def test_privacy_scan_blocks_personal_fields() -> None:
    _scan_for_personal_data({"findings": [{"evidence": {"deletions": 3}}]})
    try:
        _scan_for_personal_data({"rows": [{"name_local": "x"}]})
    except JobError as error:
        assert "name_local" in str(error)
    else:
        raise AssertionError("personal field was not caught")
