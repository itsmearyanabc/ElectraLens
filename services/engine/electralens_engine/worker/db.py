"""The job queue and database access. The worker acts as service_role, never as a superuser."""

from typing import Any

import psycopg
from psycopg.rows import dict_row
from psycopg.types.json import Jsonb

JOB_KINDS = [
    "ingest",
    "analyze",
    "publish_prepare",
    "ots_stamp",
    "ots_upgrade",
    "notify",
    "retention",
]

Connection = psycopg.Connection[dict[str, Any]]


def connect(url: str) -> Connection:
    """Session-pooler connection; drops to service_role so privileges match the design (§5.3)."""
    conn = psycopg.connect(url, autocommit=True, row_factory=dict_row)
    conn.execute("set role service_role")
    return conn


def claim(conn: Connection, worker: str, lease_seconds: int) -> dict[str, Any] | None:
    return conn.execute(
        "select * from public.claim_next_job(%s::public.job_kind[], %s, %s)",
        (JOB_KINDS, worker, lease_seconds),
    ).fetchone()


def complete(conn: Connection, job_id: str, worker: str, result: dict[str, Any]) -> None:
    conn.execute("select public.complete_job(%s, %s, %s)", (job_id, worker, Jsonb(result)))


def fail(conn: Connection, job_id: str, worker: str, error: str) -> str:
    row = conn.execute(
        "select public.fail_job(%s, %s, %s) as status", (job_id, worker, error[:2000])
    ).fetchone()
    return str(row["status"]) if row else "unknown"
