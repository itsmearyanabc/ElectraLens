"""Publication manifests (Architecture §8.3). Mirrors packages/canon/src/manifest.ts."""

from collections.abc import Mapping
from typing import Any

from electralens_engine.hashing import hash_document
from electralens_engine.schemas import validator

MANIFEST_SCHEMA = "electralens.manifest.v1"


def validate_manifest(manifest: Mapping[str, Any]) -> dict[str, Any]:
    """Raises fastjsonschema.JsonSchemaValueException if the manifest is not a valid manifest_v1."""
    validator("manifest_v1")(dict(manifest))
    return dict(manifest)


def manifest_hash(manifest: Mapping[str, Any]) -> str:
    """The value anchored on-chain: SHA-256 of the manifest's RFC 8785 form."""
    return hash_document(validate_manifest(manifest))
