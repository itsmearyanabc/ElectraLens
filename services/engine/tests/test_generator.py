import json
from collections import Counter
from pathlib import Path

import pytest

from electralens_engine.canon import dataset_commitment
from electralens_engine.csv_io import read_rows
from electralens_engine.generator import GeneratorConfig, generate

SMALL = GeneratorConfig(
    seed=7, acs=2, parts_min=16, parts_max=18, electors_min=150, electors_max=250
)
SALT = bytes(32)
OUTPUTS = ["roll_v1.csv", "roll_v2.csv", "booths.csv", "jurisdictions.json", "ground_truth.json"]


@pytest.fixture(scope="module")
def demo(tmp_path_factory: pytest.TempPathFactory) -> Path:
    out = tmp_path_factory.mktemp("demo")
    generate(SMALL, out)
    return out


def _rows(path: Path) -> list[dict]:
    return list(read_rows(path))


def test_same_seed_gives_identical_bytes(demo: Path, tmp_path: Path) -> None:
    generate(SMALL, tmp_path)
    for name in [*OUTPUTS, "generation.json"]:
        assert (demo / name).read_bytes() == (tmp_path / name).read_bytes(), name


def test_different_seed_gives_different_data(demo: Path, tmp_path: Path) -> None:
    generate(GeneratorConfig(**{**SMALL.__dict__, "seed": 8}), tmp_path)
    assert (demo / "roll_v1.csv").read_bytes() != (tmp_path / "roll_v1.csv").read_bytes()


def test_every_file_passes_canonicalisation(demo: Path) -> None:
    for name, schema in [
        ("roll_v1.csv", "electoral_roll_v1"),
        ("roll_v2.csv", "electoral_roll_v1"),
        ("booths.csv", "polling_stations_v1"),
    ]:
        commitment = dataset_commitment(_rows(demo / name), schema, SALT)
        assert commitment.row_count > 0


def test_everything_is_marked_synthetic(demo: Path) -> None:
    for name in ["roll_v1.csv", "roll_v2.csv", "booths.csv"]:
        assert {row["is_synthetic"] for row in _rows(demo / name)} == {"true"}
    assert json.loads((demo / "jurisdictions.json").read_text("utf-8"))["is_synthetic"] is True
    assert all(r["ac_code"].startswith("DEMO-") for r in _rows(demo / "roll_v1.csv"))


def test_real_districts_but_fictional_constituencies(demo: Path) -> None:
    areas = json.loads((demo / "jurisdictions.json").read_text("utf-8"))["areas"]
    state = next(a for a in areas if a["level"] == "state")
    districts = [a["name"]["en"] for a in areas if a["level"] == "district"]
    acs = [a for a in areas if a["level"] == "ac"]
    assert state["name"]["en"] == "Haryana"
    assert districts == ["Gurugram"]
    # Constituency numbers start at 901, above every real one, and every name says DEMO.
    assert all(int(a["code"].rsplit("-AC", 1)[1]) >= 901 for a in acs)
    assert all("DEMO" in a["name"]["en"] and "डेमो" in a["name"]["hi"] for a in acs)


@pytest.mark.parametrize("state", ["RJ", "MP", "UP"])
def test_other_states(state: str, tmp_path: Path) -> None:
    generate(GeneratorConfig(**{**SMALL.__dict__, "state": state}), tmp_path)
    assert all(
        r["ac_code"].startswith(f"DEMO-{state}-AC9") for r in _rows(tmp_path / "roll_v1.csv")
    )


def test_baseline_respects_polling_station_cap(demo: Path) -> None:
    sizes = Counter((r["ac_code"], r["part_no"]) for r in _rows(demo / "roll_v1.csv"))
    assert max(sizes.values()) <= 1200


def test_synthetic_booths_have_no_coordinates(demo: Path) -> None:
    booths = _rows(demo / "booths.csv")
    assert all(b["lat"] == "" and b["lng"] == "" for b in booths)
    assert all("DEMO" in b["name"]["en"] and "fictional" in b["name"]["en"] for b in booths)
    assert all("DEMO address" in b["address"]["en"] for b in booths)


def test_ground_truth_covers_every_rule_and_real_areas(demo: Path) -> None:
    truth = json.loads((demo / "ground_truth.json").read_text("utf-8"))["entries"]
    areas = {
        a["code"] for a in json.loads((demo / "jurisdictions.json").read_text("utf-8"))["areas"]
    }
    detected = {t["rule"] for t in truth if t["expect"] == "detect"}
    assert detected == {f"R{i:02d}" for i in range(1, 13)}
    assert all(t["area_code"] in areas for t in truth)
    assert any(t["expect"] == "must_not" for t in truth)
    assert any(t["innocent"] for t in truth)


def test_injected_patterns_are_present(demo: Path) -> None:
    truth = json.loads((demo / "ground_truth.json").read_text("utf-8"))["entries"]
    v1 = {r["record_key"]: r for r in _rows(demo / "roll_v1.csv")}
    v2 = _rows(demo / "roll_v2.csv")

    def part(row: dict) -> str:
        return f"{row['ac_code']}-P{int(row['part_no']):03d}"

    impossible = {part(r) for r in v2 if not 18 <= int(r["age"]) <= 110}
    assert impossible == {t["area_code"] for t in truth if t["rule"] == "R03"}

    drift = {
        part(r)
        for r in v2
        if r["record_key"] in v1 and abs(int(r["age"]) - int(v1[r["record_key"]]["age"]) - 1) > 1
    }
    assert drift == {t["area_code"] for t in truth if t["rule"] == "R04"}

    (split,) = [t for t in truth if t["rule"] == "R07" and t["expect"] == "detect"]
    in_new_part = [r for r in v2 if part(r) == split["area_code"]]
    transferred = [r for r in in_new_part if r["record_key"] in v1]
    # Transfers keep their identity and all come from the split part; the rest are newcomers.
    assert transferred
    assert {part(v1[r["record_key"]]) for r in transferred} == {split["details"]["from_part"]}
