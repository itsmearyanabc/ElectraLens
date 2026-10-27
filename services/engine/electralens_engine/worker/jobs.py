"""Job handlers. Each one reads its inputs again from the database and storage, never from the
job payload alone, and finishes through the workflow function that owns the state change."""

import hashlib
import secrets
import tempfile
from collections.abc import Callable
from dataclasses import dataclass
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from psycopg.types.json import Jsonb

from electralens_engine import ots
from electralens_engine.analysis.load import from_commitment
from electralens_engine.analysis.runner import engine_version, run_audit
from electralens_engine.canon import _commit
from electralens_engine.csv_io import read_rows
from electralens_engine.hashing import jcs_bytes
from electralens_engine.ingest import canonical_file, ingest_rows, read_canonical_file
from electralens_engine.publish import (
    aggregates_document,
    artifacts,
    manifest_document,
    published_aggregates,
    report_document,
)
from electralens_engine.worker.db import Connection
from electralens_engine.worker.storage import Storage

QUARANTINE = "quarantine"
RESTRICTED = "datasets-restricted"
PUBLIC = "public-artifacts"
# Personal fields that must never appear in anything published (FR-PUB, privacy scan).
PERSONAL_KEYS = {
    "name_local",
    "name_latin",
    "relative_name_local",
    "relative_name_latin",
    "house_no",
    "epic_like",
    "record_key",
}


class JobError(RuntimeError):
    """A failure that retrying won't fix; recorded on the job and the item."""


@dataclass
class Context:
    conn: Connection
    storage: Storage
    engine_rev: str | None


def _now() -> str:
    return datetime.now(UTC).strftime("%Y-%m-%dT%H:%M:%SZ")


def _one(ctx: Context, sql: str, params: tuple[Any, ...]) -> dict[str, Any]:
    row = ctx.conn.execute(sql, params).fetchone()
    if row is None:
        raise JobError("not_found")
    return row


# ---- ingest -----------------------------------------------------------------------------------


def ingest(ctx: Context, payload: dict[str, Any]) -> dict[str, Any]:
    version_id = payload["dataset_version_id"]
    v = _one(
        ctx,
        "select v.id, v.status, v.schema_version, v.original_path, j.code as scope "
        "from public.dataset_versions v join public.jurisdictions j on j.id = v.jurisdiction_id where v.id = %s",
        (version_id,),
    )
    if v["status"] != "validating":
        return {"skipped": f"status is {v['status']}"}
    # original_path is recorded with its bucket ("quarantine/<version>/original.csv").
    original = ctx.storage.download(QUARANTINE, v["original_path"].removeprefix(f"{QUARANTINE}/"))
    sha = hashlib.sha256(original).hexdigest()
    with tempfile.TemporaryDirectory() as tmp:
        path = Path(tmp) / "original.csv"
        path.write_bytes(original)
        salt = secrets.token_bytes(32)
        result = ingest_rows(read_rows(path), v["schema_version"], salt, v["scope"])

    canonical_path = salt_path = None
    if result.valid and result.commitment is not None:
        canonical_path = f"{version_id}/canonical.jsonl.gz"
        salt_path = f"{version_id}/salt.bin"
        ctx.storage.upload(
            RESTRICTED, canonical_path, canonical_file(result.commitment), "application/gzip"
        )
        ctx.storage.upload(RESTRICTED, salt_path, salt, "application/octet-stream")
    ctx.conn.execute(
        "select public.complete_ingestion(%s, %s, %s, %s, %s, %s, %s, %s)",
        (
            version_id,
            result.valid,
            Jsonb({**result.report, "original_sha256": sha}),
            sha,
            canonical_path,
            result.commitment.root if result.commitment else None,
            result.commitment.row_count if result.commitment else None,
            salt_path,
        ),
    )
    return {"valid": result.valid, "rows": result.report["rows_read"]}


# ---- analyze ----------------------------------------------------------------------------------


def _load_version(ctx: Context, version_id: str):
    v = _one(
        ctx,
        "select id, status, canonical_path, canonical_root, salt_path from public.dataset_versions where id = %s",
        (version_id,),
    )
    if v["status"] != "approved":
        raise JobError("workflow.dataset_not_approved")
    rows = read_canonical_file(ctx.storage.download(RESTRICTED, v["canonical_path"]))
    salt = ctx.storage.download(RESTRICTED, v["salt_path"])
    commitment = _commit(rows, salt)
    # Integrity: the stored canonical file must still hash to the root recorded at ingestion.
    if commitment.root != v["canonical_root"]:
        raise JobError("dataset.root_mismatch")
    return from_commitment(commitment, version_id=str(v["id"]))


def _areas(ctx: Context) -> list[dict[str, Any]]:
    return ctx.conn.execute(
        "select j.code, j.level::text as level, p.code as parent, j.name from public.jurisdictions j "
        "left join public.jurisdictions p on p.id = j.parent_id"
    ).fetchall()


def analyze(ctx: Context, payload: dict[str, Any]) -> dict[str, Any]:
    run_id = payload["run_id"]
    run = _one(
        ctx,
        "select id, status, baseline_version_id, target_version_id, methodology_version from public.audit_runs where id = %s",
        (run_id,),
    )
    if run["status"] != "queued":
        return {"skipped": f"status is {run['status']}"}
    ctx.conn.execute(
        "select public.start_run(%s, %s, %s)", (run_id, ctx.engine_rev or engine_version(), None)
    )
    try:
        baseline = _load_version(ctx, str(run["baseline_version_id"]))
        target = _load_version(ctx, str(run["target_version_id"]))
        result = run_audit(baseline, target, _areas(ctx), run["methodology_version"])
    except Exception as error:
        ctx.conn.execute(
            "select public.complete_run(%s, false, null, null, null, %s)",
            (run_id, str(error)[:500]),
        )
        raise JobError(f"run failed: {error}") from error

    evidence_path = f"runs/{run_id}/evidence.jsonl"
    ctx.storage.upload(
        RESTRICTED,
        evidence_path,
        b"\n".join(jcs_bytes(r) for r in result.restricted),
        "application/x-ndjson",
    )
    ids = {
        row["code"]: row["id"]
        for row in ctx.conn.execute("select id, code from public.jurisdictions")
    }
    # Findings, aggregates and the state change land together or not at all.
    with ctx.conn.transaction():
        for f in result.findings:
            ctx.conn.execute(
                "insert into public.anomaly_findings (run_id, finding_code, rule_id, rule_version, "
                "jurisdiction_id, signal_strength, finding, restricted_evidence_path) "
                "values (%s, %s, %s, %s, %s, %s, %s, %s)",
                (
                    run_id,
                    f["finding_id"],
                    f["rule"]["id"],
                    f["rule"]["version"],
                    ids[f["area"]["code"]],
                    f["signal_strength"],
                    Jsonb(f),
                    evidence_path,
                ),
            )
        with ctx.conn.cursor() as cur:
            cur.executemany(
                "insert into public.aggregate_metrics (run_id, jurisdiction_id, metric, dims, value) "
                "values (%s, %s, %s, %s, %s)",
                [
                    (run_id, ids[a["area_code"]], a["metric"], Jsonb(a["dims"]), int(a["value"]))
                    for a in result.aggregates
                ],
            )
        ctx.conn.execute(
            "select public.complete_run(%s, true, %s, %s, %s, null)",
            (
                run_id,
                Jsonb({"baseline": baseline.root, "target": target.root}),
                result.run["output_hash"],
                Jsonb(result.run["tests_in_run"]),
            ),
        )
    return {"findings": len(result.findings), "aggregates": len(result.aggregates)}


# ---- publish_prepare ---------------------------------------------------------------------------


def _scan_for_personal_data(value: Any) -> None:
    if isinstance(value, dict):
        leaked = PERSONAL_KEYS & set(value)
        if leaked:
            raise JobError(f"privacy_scan: personal field {sorted(leaked)[0]}")
        for item in value.values():
            _scan_for_personal_data(item)
    elif isinstance(value, list):
        for item in value:
            _scan_for_personal_data(item)


def publish_prepare(ctx: Context, payload: dict[str, Any]) -> dict[str, Any]:
    if not ctx.engine_rev:
        raise JobError("ELECTRALENS_GIT_SHA is not set, so the manifest can't name the engine")
    pub_id = payload["publication_id"]
    p = _one(
        ctx,
        "select id, series_id, sequence, status, run_id, previous_publication_id, is_synthetic "
        "from public.publications where id = %s",
        (pub_id,),
    )
    if p["status"] != "preparing":
        return {"skipped": f"status is {p['status']}"}
    run = _one(ctx, "select * from public.audit_runs where id = %s", (p["run_id"],))
    versions = {
        str(v["id"]): v
        for v in ctx.conn.execute(
            "select id, canonical_root, row_count, schema_version, qualifying_date from public.dataset_versions where id in (%s, %s)",
            (run["baseline_version_id"], run["target_version_id"]),
        )
    }
    findings = []
    counts = {"accepted": 0, "downgraded": 0, "rejected": 0}
    for row in ctx.conn.execute(
        "select f.finding, f.review_status::text as review_status, "
        "(select max(r.created_at) from public.finding_reviews r where r.finding_id = f.id) as reviewed_at "
        "from public.anomaly_findings f where f.run_id = %s order by f.finding_code",
        (p["run_id"],),
    ):
        doc = dict(row["finding"])
        reviewed = (
            row["reviewed_at"].astimezone(UTC).strftime("%Y-%m-%dT%H:%M:%SZ")
            if row["reviewed_at"]
            else None
        )
        doc["review"] = {"status": row["review_status"], "reviewed_at": reviewed}
        counts[row["review_status"]] = counts.get(row["review_status"], 0) + 1
        findings.append(doc)

    raw = ctx.conn.execute(
        "select j.code as area_code, j.level::text as level, a.metric, a.dims, a.value from public.aggregate_metrics a "
        "join public.jurisdictions j on j.id = a.jurisdiction_id where a.run_id = %s and a.publication_id is null",
        (p["run_id"],),
    ).fetchall()
    rows = published_aggregates(raw)
    previous = None
    if p["previous_publication_id"]:
        previous = _one(
            ctx,
            "select manifest_hash from public.publications where id = %s",
            (p["previous_publication_id"],),
        )["manifest_hash"]

    def dataset(role: str, version_id: Any) -> dict[str, Any]:
        v = versions[str(version_id)]
        return {
            "role": role,
            "version_id": str(version_id),
            "root": v["canonical_root"],
            "row_count": v["row_count"],
            "schema": v["schema_version"],
            "canon": "elcanon-1",
        }

    run_doc = {
        "id": str(run["id"]),
        "methodology": run["methodology_version"],
        "params_hash": run["params_hash"],
        "engine": run["engine_version"],
        "output_hash": run["output_hash"],
        "tests_in_run": run["tests_in_run"],
    }
    report = report_document(
        series=p["series_id"],
        sequence=p["sequence"],
        is_synthetic=p["is_synthetic"],
        notice="SYNTHETIC DATA. Every person and place below district level is fictional."
        if p["is_synthetic"]
        else None,
        run=run_doc,
        datasets={
            "baseline": str(run["baseline_version_id"]),
            "target": str(run["target_version_id"]),
        },
        findings=findings,
        review_counts=counts,
    )
    aggregates = aggregates_document(p["series_id"], p["sequence"], str(run["id"]), rows)
    _scan_for_personal_data(report)
    _scan_for_personal_data(aggregates)
    manifest = manifest_document(
        series=p["series_id"],
        sequence=p["sequence"],
        previous_manifest_hash=previous,
        is_synthetic=p["is_synthetic"],
        datasets=[
            dataset("baseline", run["baseline_version_id"]),
            dataset("target", run["target_version_id"]),
        ],
        audit_run={
            "id": str(run["id"]),
            "engine": ctx.engine_rev,
            "image": run["image_digest"],
            "methodology": run["methodology_version"],
            "params_hash": run["params_hash"],
        },
        report=report,
        aggregates=aggregates,
        published_at=_now(),
    )
    m_hash, files = artifacts(p["series_id"], p["sequence"], manifest, report, aggregates)
    # Staged privately; copied to the public bucket only once the publication is published.
    for path, data in files.items():
        ctx.storage.upload(RESTRICTED, f"publications/{path}", data, "application/json")

    ids = {
        row["code"]: row["id"]
        for row in ctx.conn.execute("select id, code from public.jurisdictions")
    }
    folder = f"{p['series_id']}/{p['sequence']}"
    with ctx.conn.transaction():
        with ctx.conn.cursor() as cur:
            cur.executemany(
                "insert into public.aggregate_metrics (run_id, publication_id, jurisdiction_id, metric, dims, value, suppressed) "
                "values (%s, %s, %s, %s, %s, %s, %s)",
                [
                    (
                        run["id"],
                        pub_id,
                        ids[r["area_code"]],
                        r["metric"],
                        Jsonb(r["dims"]),
                        r["value"],
                        r["suppressed"],
                    )
                    for r in rows
                ],
            )
        ctx.conn.execute(
            "select public.submit_publication(%s, %s, %s, %s, %s, %s, %s)",
            (
                pub_id,
                Jsonb(manifest),
                m_hash,
                f"{folder}/report.json",
                manifest["report_hash"],
                f"{folder}/aggregates.json",
                manifest["aggregates_hash"],
            ),
        )
    return {"manifest_hash": m_hash}


def no_op(_ctx: Context, payload: dict[str, Any]) -> dict[str, Any]:
    # notify: there is no outgoing email service on the free plan yet (B14.05).
    return {"skipped": payload["kind"]}


HANDLERS: dict[str, Callable[[Context, dict[str, Any]], dict[str, Any]]] = {
    "ingest": ingest,
    "analyze": analyze,
    "publish_prepare": publish_prepare,
    "notify": no_op,
}


# ---- timed sweeps --------------------------------------------------------------------------


def release_published(ctx: Context) -> int:
    """Copy staged artifacts to the public bucket once a publication is published (or retracted)."""
    released = 0
    for p in ctx.conn.execute(
        "select series_id, sequence from public.publications where status in ('published', 'retracted')"
    ).fetchall():
        folder = f"{p['series_id']}/{p['sequence']}"
        for name in ("manifest.json", "report.json", "aggregates.json"):
            path = f"{folder}/{name}"
            if not ctx.storage.exists(PUBLIC, path) and ctx.storage.exists(
                RESTRICTED, f"publications/{path}"
            ):
                ctx.storage.upload(
                    PUBLIC,
                    path,
                    ctx.storage.download(RESTRICTED, f"publications/{path}"),
                    "application/json",
                )
                released += 1
    return released


def stamp_new_publications(ctx: Context) -> int:
    """B08.11: OpenTimestamps for every published manifest that has no OTS anchor yet."""
    stamped = 0
    for p in ctx.conn.execute(
        "select p.id, p.series_id, p.sequence, p.manifest from public.publications p "
        "where p.status = 'published' and not exists (select 1 from public.blockchain_anchors a "
        "where a.publication_id = p.id and a.anchor_type = 'ots' and a.ots_path is not null)"
    ).fetchall():
        proof = ots.stamp(jcs_bytes(p["manifest"]))
        path = f"{p['series_id']}/{p['sequence']}/manifest.json.ots"
        ctx.storage.upload(PUBLIC, path, proof, "application/octet-stream")
        ctx.conn.execute(
            "insert into public.blockchain_anchors (publication_id, anchor_type, network, ots_path, status) "
            "values (%s, 'ots', 'bitcoin', %s, 'submitted') on conflict (publication_id, anchor_type) "
            "do update set ots_path = excluded.ots_path, status = 'submitted'",
            (p["id"], path),
        )
        stamped += 1
    return stamped


def upgrade_timestamps(ctx: Context) -> int:
    """B08.12: once Bitcoin confirms, store the complete proof and mark the anchor upgraded."""
    upgraded = 0
    for a in ctx.conn.execute(
        "select id, ots_path from public.blockchain_anchors where anchor_type = 'ots' and status = 'submitted'"
    ).fetchall():
        proof, status = ots.upgrade(ctx.storage.download(PUBLIC, a["ots_path"]))
        if status.complete:
            ctx.storage.upload(PUBLIC, a["ots_path"], proof, "application/octet-stream")
            ctx.conn.execute(
                "update public.blockchain_anchors set status = 'upgraded', block_number = %s, confirmed_at = now() where id = %s",
                (min(status.bitcoin_heights), a["id"]),
            )
            upgraded += 1
    return upgraded


def retention(ctx: Context) -> dict[str, int]:
    """Threat model §5.1: security events 180 days, IP hashes 30 days, unpublished claims 1 year."""
    events = ctx.conn.execute(
        "delete from public.security_events where at < now() - interval '180 days'"
    ).rowcount
    hashes = ctx.conn.execute(
        "update public.claim_submissions set ip_hash = null where ip_hash is not null and created_at < now() - interval '30 days'"
    ).rowcount
    claims = ctx.conn.execute(
        "delete from public.claim_submissions where status <> 'published' and created_at < now() - interval '1 year'"
    ).rowcount
    return {"security_events": events, "ip_hashes": hashes, "claims": claims}
