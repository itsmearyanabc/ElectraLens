"""The shared vector files must match this implementation (the TS suite checks the same files)."""

import json

import pytest

from electralens_engine.paths import vectors_dir
from electralens_engine.vectors import build_vectors, stale_vectors


def test_vector_files_are_up_to_date() -> None:
    assert stale_vectors(vectors_dir()) == [], "run `uv run el vectors --write`"


def test_root_assertions_hold() -> None:
    vectors = build_vectors()
    for vector in vectors.values():
        asserts = vector.get("assert", {})
        root = vector.get("expected", {}).get("root")
        if "same_root_as" in asserts:
            assert root == vectors[asserts["same_root_as"]]["expected"]["root"], vector["name"]
        if "different_root_from" in asserts:
            assert root != vectors[asserts["different_root_from"]]["expected"]["root"], vector[
                "name"
            ]


def test_empty_dataset_root() -> None:
    expected = build_vectors()["roll-empty"]["expected"]
    assert expected["row_count"] == 0
    assert expected["root"] == "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"


@pytest.mark.parametrize("name", sorted(build_vectors()))
def test_vector_files_parse(name: str) -> None:
    with (vectors_dir() / f"{name}.json").open(encoding="utf-8") as f:
        assert json.load(f)["name"] == name
