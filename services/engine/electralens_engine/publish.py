"""Building a publication: suppressed aggregates, the report and the manifest (B16, DF3).

Shared by the worker's publish_prepare job and the demo loader, so both produce byte-identical
artifacts. Every document is serialised with RFC 8785, and those exact bytes are what is hashed,
stored in public-artifacts and anchored.
"""

from typing import Any

from electralens_engine.hashing import hash_document, jcs_bytes
from electralens_engine.manifest import manifest_hash, validate_manifest

PUBLISHER = "ElectraLens (independent, not affiliated with ECI)"
SUPPRESS_BELOW = 10
# Aggregates that are counts of people; net change is a difference and is not suppressed.
COUNT_METRICS = frozenset(
    {
        "electors_baseline",
        "electors_target",
        "additions",
        "additions_18_19",
        "deletions",
        "transfers_in",
        "transfers_out",
        "corrections",
        "deletions_by_reason",
        "electors_target_by_gender",
        "electors_target_by_age_band",
    }
)


def suppress(row: dict[str, Any]) -> tuple[int | None, bool]:
    """Counts of 1 to 9 people are hidden; zero is not disclosive and stays."""
    value = int(row["value"])
    if row["metric"] in COUNT_METRICS and 0 < value < SUPPRESS_BELOW:
        return None, True
    return value, False


def published_aggregates(aggregates: list[dict[str, Any]]) -> list[dict[str, Any]]:
    rows = []
    for row in aggregates:
        value, suppressed = suppress(row)
        rows.append(
            {
                "area_code": row["area_code"],
                "level": row["level"],
                "metric": row["metric"],
                "dims": row["dims"],
                "value": value,
                "suppressed": suppressed,
            }
        )
    return rows


def aggregates_document(
    series: str, sequence: int, run_id: str, rows: list[dict[str, Any]]
) -> dict[str, Any]:
    return {
        "schema": "electralens.aggregates.v1",
        "series_id": series,
        "sequence": sequence,
        "run_id": run_id,
        "suppression": {"below": SUPPRESS_BELOW, "metrics": sorted(COUNT_METRICS)},
        "rows": rows,
    }


def report_document(
    *,
    series: str,
    sequence: int,
    is_synthetic: bool,
    notice: str | None,
    run: dict[str, Any],
    datasets: dict[str, Any],
    findings: list[dict[str, Any]],
    review_counts: dict[str, int],
    benchmark: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """The public report: run facts, review counts (including rejections) and public findings."""
    public = [
        f
        for f in findings
        if f["review"]["status"] in ("accepted", "downgraded") and f["signal_strength"] != "weak"
    ]
    report: dict[str, Any] = {
        "schema": "electralens.report.v1",
        "series_id": series,
        "sequence": sequence,
        "is_synthetic": is_synthetic,
        "notice": notice,
        "run": run,
        "datasets": datasets,
        "findings_total": len(findings),
        "review_counts": review_counts,
        "weak_findings_not_published": sum(1 for f in findings if f["signal_strength"] == "weak"),
        "findings": public,
    }
    if benchmark is not None:
        report["benchmark"] = benchmark
    return report


def manifest_document(
    *,
    series: str,
    sequence: int,
    previous_manifest_hash: str | None,
    is_synthetic: bool,
    datasets: list[dict[str, Any]],
    audit_run: dict[str, Any] | None,
    report: dict[str, Any],
    aggregates: dict[str, Any],
    published_at: str,
) -> dict[str, Any]:
    manifest = {
        "schema": "electralens.manifest.v1",
        "series_id": series,
        "sequence": sequence,
        "previous_manifest_hash": previous_manifest_hash,
        "is_synthetic": is_synthetic,
        "datasets": datasets,
        "audit_run": audit_run,
        "report_hash": hash_document(report),
        "aggregates_hash": hash_document(aggregates),
        "published_at": published_at,
        "publisher": PUBLISHER,
    }
    validate_manifest(manifest)
    return manifest


def artifacts(
    series: str,
    sequence: int,
    manifest: dict[str, Any],
    report: dict[str, Any],
    aggregates: dict[str, Any],
) -> tuple[str, dict[str, bytes]]:
    """Object paths and exact bytes for public-artifacts, plus the manifest hash they commit to."""
    folder = f"{series}/{sequence}"
    files = {
        f"{folder}/manifest.json": jcs_bytes(manifest),
        f"{folder}/report.json": jcs_bytes(report),
        f"{folder}/aggregates.json": jcs_bytes(aggregates),
    }
    return manifest_hash(manifest), files
