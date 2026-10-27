"""End-to-end audit on a generated roll: detection quality, finding completeness, determinism."""

import json
import os
from pathlib import Path

import pytest

from electralens_engine.analysis.benchmark import benchmark
from electralens_engine.analysis.load import load_csv
from electralens_engine.analysis.runner import RunResult, run_audit
from electralens_engine.explain.banned import find_banned
from electralens_engine.generator import GeneratorConfig, generate
from electralens_engine.models.finding_v1 import FindingV1

CONFIG = GeneratorConfig(
    seed=11, acs=2, parts_min=16, parts_max=18, electors_min=400, electors_max=700
)
SALT = bytes(32)
GOLDEN = Path(__file__).parent / "golden" / "audit_small.json"


@pytest.fixture(scope="module")
def data(tmp_path_factory: pytest.TempPathFactory) -> Path:
    out = tmp_path_factory.mktemp("audit")
    generate(CONFIG, out)
    return out


@pytest.fixture(scope="module")
def result(data: Path) -> RunResult:
    areas = json.loads((data / "jurisdictions.json").read_text("utf-8"))["areas"]
    return run_audit(
        load_csv(data / "roll_v1.csv", SALT), load_csv(data / "roll_v2.csv", SALT), areas
    )


def test_detects_every_injected_anomaly_without_violating_negative_controls(
    data: Path, result: RunResult
) -> None:
    truth = json.loads((data / "ground_truth.json").read_text("utf-8"))["entries"]
    report = benchmark(result.findings, truth)
    missed = {
        rule: r["missed_areas"] for rule, r in report["per_rule"].items() if r["missed_areas"]
    }
    assert missed == {}
    assert report["negative_control_violations"] == []


def test_every_finding_is_complete(result: RunResult) -> None:  # AC-9
    assert result.findings
    for f in result.findings:
        FindingV1.model_validate(f)
        assert set(f["explanation"]) >= {"en", "hi"}
        assert len(f["alternative_explanations"]) >= 2
        assert f["review"]["status"] == "pending"
        assert "lim.synthetic_data" in f["limitations"]
        if f["signal_strength"] != "data_quality":
            assert {"q_value", "p_value", "tests_in_run"} <= set(f["evidence"])
            assert f["baseline"] is not None


def test_no_banned_terms_in_generated_findings(result: RunResult) -> None:  # AC-10
    for f in result.findings:
        for text in f["explanation"].values():
            assert find_banned(text) == []


def test_public_findings_carry_no_row_level_data(data: Path, result: RunResult) -> None:  # NFR-1
    public = json.dumps(result.findings, ensure_ascii=False)
    keys = {
        line.split(",")[0] for line in (data / "roll_v2.csv").read_text("utf-8").splitlines()[1:]
    }
    assert not any(key in public for key in keys)
    assert "house_no" not in public


def test_every_part_is_tested(result: RunResult) -> None:  # FR-AUD-9
    assert result.run["every_part_tested"] is True
    assert (
        result.run["tests_in_run"]["R05"] >= result.run["parts"] - 2
    )  # only new or tiny parts skipped


def test_same_inputs_give_identical_output(data: Path, result: RunResult) -> None:  # AC-2
    areas = json.loads((data / "jurisdictions.json").read_text("utf-8"))["areas"]
    again = run_audit(
        load_csv(data / "roll_v1.csv", SALT), load_csv(data / "roll_v2.csv", SALT), areas
    )
    assert again.run["output_hash"] == result.run["output_hash"]
    assert again.findings == result.findings


def test_golden_output_hash(result: RunResult) -> None:
    """Fails when results change. If the change is intended, bump the methodology version or
    rerun with UPDATE_GOLDEN=1 and say why in the commit."""
    current = {"output_hash": result.run["output_hash"], "findings": result.run["findings_total"]}
    if os.environ.get("UPDATE_GOLDEN") == "1":
        GOLDEN.parent.mkdir(exist_ok=True)
        GOLDEN.write_text(json.dumps(current, indent=2) + "\n", encoding="utf-8", newline="\n")
    assert json.loads(GOLDEN.read_text("utf-8")) == current
