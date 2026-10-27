"""Pydantic models generated from the shared JSON Schemas (B01.02).

The zod schemas in packages/schemas are the single source of truth. They're exported to JSON
Schema, and these models are generated from that, so Python can't drift from TypeScript.
"""

import subprocess
import sys
from pathlib import Path

from electralens_engine.paths import schema_dir

SCHEMA_NAMES = (
    "electoral_roll_v1",
    "polling_stations_v1",
    "finding_v1",
    "manifest_v1",
    "claim_v1",
    "job_payload_v1",
)
MODELS_DIR = Path(__file__).parent / "models"
_ARGS = [
    "--input-file-type", "jsonschema",
    "--output-model-type", "pydantic_v2.BaseModel",
    "--target-python-version", "3.12",
    "--field-constraints",
    "--formatters", "builtin",
    "--disable-timestamp",
    "--use-double-quotes",
    # Keep dates, timestamps and UUIDs as strings: that's their canonical (hashed) form, and
    # the schema's own patterns validate them.
    "--type-mappings", "date=string", "date-time=string", "uuid=string",
]  # fmt: skip
_INIT = '"""Generated pydantic models. Do not edit: run `uv run el models --write`."""\n'


def render(name: str) -> str:
    result = subprocess.run(  # noqa: S603 - fixed arguments, no shell
        [
            sys.executable,
            "-m",
            "datamodel_code_generator",
            "--input",
            str(schema_dir() / f"{name}.schema.json"),
            *_ARGS,
        ],
        capture_output=True,
        text=True,
        encoding="utf-8",
        check=True,
    )
    return result.stdout


def write_models() -> list[Path]:
    MODELS_DIR.mkdir(exist_ok=True)
    (MODELS_DIR / "__init__.py").write_text(_INIT, encoding="utf-8", newline="\n")
    written = []
    for name in SCHEMA_NAMES:
        path = MODELS_DIR / f"{name}.py"
        path.write_text(render(name), encoding="utf-8", newline="\n")
        written.append(path)
    return written


def stale_models() -> list[str]:
    stale = []
    for name in SCHEMA_NAMES:
        path = MODELS_DIR / f"{name}.py"
        if not path.is_file() or path.read_text(encoding="utf-8") != render(name):
            stale.append(name)
    return stale
