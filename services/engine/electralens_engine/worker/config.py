"""Worker configuration. Secrets come from *_FILE paths (Docker secrets), never the image."""

import os
import re
from collections.abc import Mapping
from dataclasses import dataclass
from pathlib import Path


def _secret(env: Mapping[str, str], name: str) -> str:
    path = env.get(f"{name}_FILE")
    value = Path(path).read_text(encoding="utf-8").strip() if path else env.get(name, "")
    if not value:
        raise RuntimeError(f"{name} or {name}_FILE must be set")
    return value


@dataclass(frozen=True)
class WorkerConfig:
    database_url: str
    supabase_url: str
    secret_key: str
    worker_id: str
    poll_interval: float
    lease_seconds: int
    git_sha: str | None
    """Commit the image was built from; manifests name the engine by it."""

    @property
    def engine_rev(self) -> str | None:
        return f"git:{self.git_sha}" if self.git_sha else None


def load_config(env: Mapping[str, str] = os.environ) -> WorkerConfig:
    sha = env.get("ELECTRALENS_GIT_SHA", "").strip().lower() or None
    if sha is not None and not re.fullmatch(r"[0-9a-f]{7,40}", sha):
        raise RuntimeError("ELECTRALENS_GIT_SHA must be a hex commit id")
    return WorkerConfig(
        database_url=_secret(env, "DATABASE_URL"),
        supabase_url=env.get("SUPABASE_URL", "").rstrip("/") or _secret(env, "SUPABASE_URL"),
        secret_key=_secret(env, "SUPABASE_SECRET_KEY"),
        worker_id=env.get("WORKER_ID", f"worker-{os.getpid()}"),
        poll_interval=int(env.get("POLL_INTERVAL_MS", "3000")) / 1000,
        lease_seconds=int(env.get("LEASE_SECONDS", "900")),
        git_sha=sha,
    )
