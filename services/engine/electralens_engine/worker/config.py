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


def read_env_file(path: str | Path) -> dict[str, str]:
    """KEY=value lines as Node's --env-file reads them: the value is everything after the first
    `=`, taken literally (one pair of matching quotes is removed); blank lines and # comments are
    skipped. Passwords with `@`, `!` or `$` need no escaping."""
    values: dict[str, str] = {}
    for raw in Path(path).read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        value = value.strip()
        if len(value) >= 2 and value[0] == value[-1] and value[0] in "\"'":
            value = value[1:-1]
        values[key.strip().removeprefix("export ").strip()] = value
    return values


def with_env_file(env: Mapping[str, str]) -> dict[str, str]:
    """The environment plus ELECTRALENS_ENV_FILE's values; variables already set win."""
    path = env.get("ELECTRALENS_ENV_FILE")
    return {**(read_env_file(path) if path else {}), **env}


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
