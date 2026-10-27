"""The committed database seed must carry the engine's current methodology, unchanged."""

import json

from electralens_engine.methodology import load_methodology, params_hash
from electralens_engine.paths import repo_root
from electralens_engine.seed import area_id, seed_sql


def test_committed_seed_has_the_current_methodology() -> None:
    seed = (repo_root() / "supabase" / "seed.sql").read_text(encoding="utf-8")
    assert params_hash("2026.1") in seed, "methodology changed: rerun `uv run el seed-sql`"
    params = json.dumps(load_methodology("2026.1"), ensure_ascii=False, sort_keys=True)
    assert params in seed


def test_area_ids_are_stable_and_parents_come_first() -> None:
    assert area_id("DEMO-HR") == area_id("DEMO-HR")
    assert area_id("DEMO-HR") != area_id("DEMO-HR-D01")
    sql = seed_sql(
        [
            {
                "code": "DEMO-HR-D01",
                "level": "district",
                "parent": "DEMO-HR",
                "name": {"en": "Gurugram"},
            },
            {"code": "DEMO-HR", "level": "state", "parent": None, "name": {"en": "Haryana"}},
        ]
    )
    assert sql.index("'DEMO-HR', 'state'") < sql.index("'DEMO-HR-D01', 'district'")
    assert "O'Brien".replace("'", "''") == "O''Brien"  # quoting rule used by _literal
