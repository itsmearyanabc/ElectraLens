"""The worker loop: claim a job, run it, report back; between jobs, run the timed sweeps."""

import logging
import signal
import time
from collections.abc import Callable
from typing import Any

from electralens_engine.worker import db
from electralens_engine.worker.config import WorkerConfig
from electralens_engine.worker.jobs import (
    HANDLERS,
    Context,
    JobError,
    release_published,
    retention,
    stamp_new_publications,
    upgrade_timestamps,
)
from electralens_engine.worker.storage import Storage

log = logging.getLogger("electralens.worker")

# Sweep name, interval in seconds, function.
SWEEPS: list[tuple[str, int, Callable[[Context], Any]]] = [
    ("release_published", 60, release_published),
    ("stamp_new_publications", 300, stamp_new_publications),
    ("upgrade_timestamps", 3600, upgrade_timestamps),
    ("retention", 86400, retention),
]


def run_job(ctx: Context, job: dict[str, Any], worker: str) -> None:
    kind, job_id = job["kind"], str(job["id"])
    handler = HANDLERS.get(kind)
    try:
        if handler is None:
            raise JobError(f"no handler for {kind}")
        result = handler(ctx, dict(job["payload"]))
        db.complete(ctx.conn, job_id, worker, result)
        log.info("job %s %s done %s", kind, job_id, result)
    # Every failure is recorded on the job, which is then retried or dead-lettered.
    except Exception as error:
        status = db.fail(ctx.conn, job_id, worker, f"{type(error).__name__}: {error}")
        log.warning("job %s %s failed (%s): %s", kind, job_id, status, error)


def run_sweeps(ctx: Context, last: dict[str, float], now: float) -> None:
    for name, every, sweep in SWEEPS:
        if now - last.get(name, 0.0) < every:
            continue
        last[name] = now
        try:
            result = sweep(ctx)
            if result:
                log.info("sweep %s: %s", name, result)
        except Exception as error:  # a sweep failing must not stop the queue
            log.warning("sweep %s failed: %s", name, error)


def run_forever(config: WorkerConfig, once: bool = False) -> None:
    stopping = False

    def stop(_signum: int, _frame: object) -> None:
        nonlocal stopping
        stopping = True

    signal.signal(signal.SIGINT, stop)
    signal.signal(signal.SIGTERM, stop)
    ctx = Context(
        db.connect(config.database_url),
        Storage(config.supabase_url, config.secret_key),
        config.engine_rev,
    )
    last: dict[str, float] = {}
    log.info("worker %s started", config.worker_id)
    while not stopping:
        run_sweeps(ctx, last, time.monotonic())
        job = db.claim(ctx.conn, config.worker_id, config.lease_seconds)
        if job is not None:
            run_job(ctx, job, config.worker_id)
            continue
        if once:
            break
        time.sleep(config.poll_interval)
    ctx.conn.close()
    log.info("worker %s stopped", config.worker_id)
