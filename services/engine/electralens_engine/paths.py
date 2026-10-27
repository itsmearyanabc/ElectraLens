"""Locations of shared repository assets (schemas, translations, test vectors).

Inside the monorepo they're found by walking up to the workspace root. In a container,
set ELECTRALENS_SCHEMA_DIR (and friends) to where the assets were copied.
"""

import os
from functools import cache
from pathlib import Path


@cache
def repo_root() -> Path:
    for parent in Path(__file__).resolve().parents:
        if (parent / "pnpm-workspace.yaml").is_file():
            return parent
    raise FileNotFoundError("monorepo root not found; set ELECTRALENS_SCHEMA_DIR")


def schema_dir() -> Path:
    override = os.environ.get("ELECTRALENS_SCHEMA_DIR")
    return Path(override) if override else repo_root() / "packages" / "schemas" / "json"


def i18n_dir() -> Path:
    override = os.environ.get("ELECTRALENS_I18N_DIR")
    return Path(override) if override else repo_root() / "packages" / "i18n"


def vectors_dir() -> Path:
    override = os.environ.get("ELECTRALENS_VECTORS_DIR")
    return Path(override) if override else repo_root() / "test-vectors" / "canon"
