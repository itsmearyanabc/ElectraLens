"""Audit run orchestration and the reproducibility record (B04.09, FR-AUD-6).

A run is a pure function of (baseline, target, methodology, engine source): same inputs, same
output hash. Row-level evidence is written separately and belongs to the restricted tier.
"""

import hashlib
import json
import uuid
from dataclasses import dataclass
from functools import cache
from pathlib import Path
from typing import Any

from electralens_engine.analysis.aggregates import aggregate_rows, part_table
from electralens_engine.analysis.diff import compare
from electralens_engine.analysis.findings import build_findings
from electralens_engine.analysis.load import RollVersion
from electralens_engine.analysis.rules import RULES, Context, dec6
from electralens_engine.hashing import hash_document
from electralens_engine.methodology import load_methodology, params_hash
from electralens_engine.paths import i18n_dir

_PACKAGE = Path(__file__).resolve().parent.parent


@cache
def engine_version() -> str:
    """Hash of everything that can change a result: engine code, methodology files, catalogues."""
    # Labelled by location relative to their root, so the hash is the same wherever the
    # engine and the translation files are installed.
    files = {
        f"engine/{p.relative_to(_PACKAGE).as_posix()}": p
        for p in [*_PACKAGE.rglob("*.py"), *(_PACKAGE / "methodology").glob("*.json")]
        if "models" not in p.relative_to(_PACKAGE).parts
    }
    i18n = i18n_dir()
    files |= {
        f"i18n/{p.relative_to(i18n).as_posix()}": p
        for p in [*(i18n / "catalogue").glob("*.json"), i18n / "banned-terms.json"]
    }
    digest = hashlib.sha256()
    for label in sorted(files):
        digest.update(label.encode())
        digest.update(files[label].read_bytes().replace(b"\r\n", b"\n"))
    return f"src:{digest.hexdigest()[:16]}"


@dataclass(frozen=True)
class RunResult:
    run: dict[str, Any]
    findings: list[dict[str, Any]]
    aggregates: list[dict[str, Any]]
    restricted: list[dict[str, Any]]


def _version_record(v: RollVersion) -> dict[str, Any]:
    return {
        "version_id": v.version_id,
        "root": v.root,
        "row_count": v.row_count,
        "qualifying_date": v.qualifying_date,
    }


def run_audit(
    baseline: RollVersion,
    target: RollVersion,
    areas: list[dict[str, Any]],
    methodology_version: str = "2026.1",
) -> RunResult:
    methodology = load_methodology(methodology_version)
    diff = compare(baseline, target)
    table = part_table(baseline, target, diff)
    ctx = Context(
        baseline=baseline, target=target, diff=diff, parts=table.parts, methodology=methodology
    )

    candidates = [c for _, rule in RULES for c in rule(ctx)]
    outcome = build_findings(candidates, ctx, areas, int(target.qualifying_date[:4]))
    aggregates = aggregate_rows(table, areas)
    output_hash = hash_document({"findings": outcome.findings, "aggregates": aggregates})

    by_rule: dict[str, dict[str, int]] = {}
    for f in outcome.findings:
        counts = by_rule.setdefault(f["rule"]["id"], {})
        counts[f["signal_strength"]] = counts.get(f["signal_strength"], 0) + 1
    engine = engine_version()
    p_hash = params_hash(methodology_version)
    run_id = str(
        uuid.UUID(
            bytes=hashlib.sha256(f"{baseline.root}{target.root}{p_hash}{engine}".encode()).digest()[
                :16
            ],
            version=4,
        )
    )
    run = {
        "run_id": run_id,
        "methodology": methodology_version,
        "params_hash": p_hash,
        "engine": engine,
        "baseline": _version_record(baseline),
        "target": _version_record(target),
        "elapsed_years": dec6(diff.elapsed_years),
        "every_part_tested": True,
        "parts": int(table.parts.height),
        "tests_in_run": outcome.tests_in_run,
        "findings_by_rule": dict(sorted(by_rule.items())),
        "findings_total": len(outcome.findings),
        "output_hash": output_hash,
        "is_synthetic": baseline.is_synthetic and target.is_synthetic,
    }
    return RunResult(
        run=run, findings=outcome.findings, aggregates=aggregates, restricted=outcome.restricted
    )


def _write_json(path: Path, data: object) -> None:
    path.write_text(
        json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8", newline="\n"
    )


def write_run(result: RunResult, out_dir: Path) -> None:
    out_dir.mkdir(parents=True, exist_ok=True)
    _write_json(out_dir / "run.json", result.run)
    _write_json(out_dir / "findings.json", result.findings)
    _write_json(out_dir / "aggregates.json", result.aggregates)
    restricted = out_dir / "restricted"
    restricted.mkdir(exist_ok=True)
    (restricted / "README.txt").write_text(
        "RESTRICTED TIER. Row-level evidence for reviewers with MFA only. Never publish.\n",
        encoding="utf-8",
    )
    with (restricted / "evidence.jsonl").open("w", encoding="utf-8", newline="\n") as f:
        for item in result.restricted:
            f.write(json.dumps(item, ensure_ascii=False) + "\n")
