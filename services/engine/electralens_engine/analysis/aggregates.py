"""Per-part counts, and the public aggregate table rolled up to every level (B04.02).

Aggregate rows are integers only. Suppression of small cells happens at publication (B16).
"""

from dataclasses import dataclass

import polars as pl

from electralens_engine.analysis.diff import UNRECORDED, UNSPECIFIED, RollDiff
from electralens_engine.analysis.load import RollVersion

REASONS = ["D", "S", "A", "R", UNRECORDED, UNSPECIFIED]
GENDERS = ["M", "F", "T"]
AGE_BANDS = [(18, 19), (20, 29), (30, 39), (40, 49), (50, 59), (60, 69), (70, 79), (80, 150)]
KEY = ["ac_code", "part_no"]


def part_code(ac_code: str, part_no: int) -> str:
    return f"{ac_code}-P{part_no:03d}"


def _count(frame: pl.DataFrame, name: str, condition: pl.Expr | None = None) -> pl.DataFrame:
    if condition is not None:
        frame = frame.filter(condition)
    return frame.group_by(KEY).agg(pl.len().cast(pl.Int64).alias(name))


@dataclass(frozen=True)
class PartTable:
    parts: pl.DataFrame
    """One row per part present in either version, with every count used by the rules."""


def part_table(baseline: RollVersion, target: RollVersion, diff: RollDiff) -> PartTable:
    b, t, ch = baseline.active(), target.active(), diff.changes
    is_change = lambda kind: pl.col("change") == kind  # noqa: E731
    frames = [
        _count(b, "electors_baseline"),
        _count(t, "electors_target"),
        _count(ch, "additions", is_change("addition")),
        _count(ch, "additions_18_19", is_change("addition") & pl.col("age").is_between(18, 19)),
        _count(ch, "deletions", is_change("deletion")),
        _count(ch, "transfers_out", is_change("transfer_out")),
        _count(ch, "transfers_in", is_change("transfer_in")),
        _count(
            ch, "corrections", is_change("continuing") & (pl.col("corrected_fields").list.len() > 0)
        ),
        _count(
            t,
            "missing_fields",
            pl.any_horizontal(
                pl.col("house_no").is_null(),
                pl.col("relative_name_latin").is_null(),
                pl.col("relative_name_local").is_null(),
                pl.col("relation_type").is_null(),
            ),
        ),
    ]
    frames += [
        _count(ch, f"deletions_{r}", is_change("deletion") & (pl.col("reason") == r))
        for r in REASONS
    ]
    for g in GENDERS:
        frames.append(_count(b, f"baseline_{g}", pl.col("gender") == g))
        frames.append(_count(t, f"target_{g}", pl.col("gender") == g))
        frames.append(_count(ch, f"deletions_{g}", is_change("deletion") & (pl.col("gender") == g)))
    for low, high in AGE_BANDS:
        frames.append(_count(t, f"age_{low}_{high}", pl.col("age").is_between(low, high)))

    keys = pl.concat([f.select(KEY) for f in frames]).unique()
    parts = keys
    for f in frames:
        parts = parts.join(f, on=KEY, how="left")
    parts = (
        parts.fill_null(0)
        .with_columns(
            (pl.col("electors_target") - pl.col("electors_baseline")).alias("net_change"),
            pl.struct(KEY)
            .map_elements(lambda r: part_code(r["ac_code"], r["part_no"]), return_dtype=pl.String)
            .alias("part_code"),
        )
        .sort(KEY)
    )
    return PartTable(parts=parts)


METRICS = {
    "electors_baseline": {},
    "electors_target": {},
    "additions": {},
    "additions_18_19": {},
    "deletions": {},
    "transfers_in": {},
    "transfers_out": {},
    "corrections": {},
    "net_change": {},
    **{f"deletions_{r}": {"metric": "deletions_by_reason", "dims": {"reason": r}} for r in REASONS},
    **{
        f"target_{g}": {"metric": "electors_target_by_gender", "dims": {"gender": g}}
        for g in GENDERS
    },
    **{
        f"age_{low}_{high}": {
            "metric": "electors_target_by_age_band",
            "dims": {"band": f"{low}-{high}"},
        }
        for low, high in AGE_BANDS
    },
}


def aggregate_rows(table: PartTable, areas: list[dict]) -> list[dict]:
    """Long-form integer aggregates for parts, constituencies, districts and the state."""
    parent = {a["code"]: a["parent"] for a in areas}
    level = {a["code"]: a["level"] for a in areas}
    columns = list(METRICS)
    totals: dict[str, dict[str, int]] = {}
    for row in table.parts.select(["part_code", "ac_code", *columns]).iter_rows(named=True):
        chain = [row["part_code"], row["ac_code"]]
        while parent.get(chain[-1]):
            chain.append(parent[chain[-1]])
        for code in chain:
            bucket = totals.setdefault(code, dict.fromkeys(columns, 0))
            for c in columns:
                bucket[c] += int(row[c])
    out = []
    for code in sorted(totals):
        for column, spec in METRICS.items():
            out.append(
                {
                    "area_code": code,
                    "level": level.get(code, "part"),
                    "metric": spec.get("metric", column),
                    "dims": spec.get("dims", {}),
                    "value": totals[code][column],
                }
            )
    return out
