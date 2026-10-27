"""Generated pydantic models: fresh, and in agreement with the canonicaliser's output."""

import json

import pytest
from pydantic import ValidationError

from electralens_engine.codegen import stale_models
from electralens_engine.models.electoral_roll_v1 import ElectoralRollV1
from electralens_engine.models.manifest_v1 import ManifestV1
from electralens_engine.models.polling_stations_v1 import PollingStationsV1
from electralens_engine.vectors import build_vectors


def test_models_match_the_schemas() -> None:
    assert stale_models() == [], "run `uv run el models --write`"


def test_canonical_rows_validate_against_the_models() -> None:
    vectors = build_vectors()
    for row in vectors["roll-basic"]["expected"]["canonical_rows"]:
        ElectoralRollV1.model_validate(json.loads(row))
    for row in vectors["booths-basic"]["expected"]["canonical_rows"]:
        PollingStationsV1.model_validate(json.loads(row))
    ManifestV1.model_validate(vectors["documents"]["manifest"]["doc"])


def test_models_reject_unknown_fields() -> None:
    row = json.loads(build_vectors()["roll-basic"]["expected"]["canonical_rows"][0])
    with pytest.raises(ValidationError):
        ElectoralRollV1.model_validate({**row, "party": "X"})
