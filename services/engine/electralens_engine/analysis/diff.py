"""Record-level comparison of two roll versions (B04.01).

Electors are matched by `record_key`. A move between parts is a transfer, not a deletion
plus an addition, so polling-station reorganisations don't look like mass deletions.
"""

from dataclasses import dataclass
from datetime import date

import polars as pl

from electralens_engine.analysis.load import RollVersion

CORRECTABLE = [
    "name_local",
    "name_latin",
    "relative_name_local",
    "relative_name_latin",
    "relation_type",
    "gender",
    "house_no",
]
UNRECORDED = "unrecorded"  # on the earlier roll, absent from the later one with no deletion entry
UNSPECIFIED = "unspecified"  # deleted, but no reason recorded


@dataclass(frozen=True)
class RollDiff:
    changes: pl.DataFrame
    """One row per elector event: addition, deletion, transfer_out, transfer_in, continuing.
    Every elector on both rolls has a `continuing` row (moved or not), so corrections and age
    changes are checked for everyone; a move adds a transfer_out and transfer_in pair."""
    elapsed_years: float


def elapsed_years(baseline: RollVersion, target: RollVersion) -> float:
    """Calendar years between qualifying dates: 1 Jan to 1 Jan is exactly 1, 1 Jan to 1 Apr 0.25."""
    a, b = date.fromisoformat(baseline.qualifying_date), date.fromisoformat(target.qualifying_date)
    months = (b.year - a.year) * 12 + (b.month - a.month)
    return months / 12 + (b.day - a.day) / 365.25


def compare(baseline: RollVersion, target: RollVersion) -> RollDiff:
    elapsed = elapsed_years(baseline, target)
    if elapsed < 0:
        raise ValueError("the baseline must be the earlier roll version")
    cols = ["ac_code", "part_no", "age", *CORRECTABLE]  # CORRECTABLE includes gender
    b = (
        baseline.active()
        .select("record_key", *[pl.col(c).alias(f"b_{c}") for c in cols])
        .with_columns(pl.lit(True).alias("in_baseline"))
    )
    t = target.rows.select(
        "record_key",
        *[pl.col(c).alias(f"t_{c}") for c in [*cols, "status", "deletion_reason"]],
    ).with_columns(pl.lit(True).alias("in_target"))
    j = b.join(t, on="record_key", how="full", coalesce=True).with_columns(
        pl.col("in_baseline").fill_null(False), pl.col("in_target").fill_null(False)
    )

    in_b, in_t = pl.col("in_baseline"), pl.col("in_target")
    t_active = pl.col("t_status") == "active"
    moved = (pl.col("b_ac_code") != pl.col("t_ac_code")) | (
        pl.col("b_part_no") != pl.col("t_part_no")
    )

    deletions = j.filter(in_b & (~in_t | (pl.col("t_status") == "deleted"))).select(
        "record_key",
        pl.lit("deletion").alias("change"),
        pl.col("b_ac_code").alias("ac_code"),
        pl.col("b_part_no").alias("part_no"),
        pl.when(~in_t)
        .then(pl.lit(UNRECORDED))
        .otherwise(pl.col("t_deletion_reason").fill_null(UNSPECIFIED))
        .alias("reason"),
        pl.col("b_gender").alias("gender"),
        pl.col("b_age").alias("age"),
    )
    additions = j.filter(~in_b & in_t & t_active).select(
        "record_key",
        pl.lit("addition").alias("change"),
        pl.col("t_ac_code").alias("ac_code"),
        pl.col("t_part_no").alias("part_no"),
        pl.lit(None, pl.String).alias("reason"),
        pl.col("t_gender").alias("gender"),
        pl.col("t_age").alias("age"),
    )
    staying = j.filter(in_b & in_t & t_active)
    transfers_out = staying.filter(moved).select(
        "record_key",
        pl.lit("transfer_out").alias("change"),
        pl.col("b_ac_code").alias("ac_code"),
        pl.col("b_part_no").alias("part_no"),
        pl.lit(None, pl.String).alias("reason"),
        pl.col("b_gender").alias("gender"),
        pl.col("b_age").alias("age"),
    )
    transfers_in = staying.filter(moved).select(
        "record_key",
        pl.lit("transfer_in").alias("change"),
        pl.col("t_ac_code").alias("ac_code"),
        pl.col("t_part_no").alias("part_no"),
        pl.lit(None, pl.String).alias("reason"),
        pl.col("t_gender").alias("gender"),
        pl.col("t_age").alias("age"),
    )
    expected_age = pl.col("b_age") + round(elapsed)
    field_changes = [
        pl.when(pl.col(f"b_{c}").ne_missing(pl.col(f"t_{c}"))).then(pl.lit(c)) for c in CORRECTABLE
    ] + [pl.when(pl.col("t_age") != expected_age).then(pl.lit("age"))]
    continuing = staying.select(
        "record_key",
        pl.lit("continuing").alias("change"),
        pl.col("t_ac_code").alias("ac_code"),
        pl.col("t_part_no").alias("part_no"),
        pl.lit(None, pl.String).alias("reason"),
        pl.col("t_gender").alias("gender"),
        pl.col("t_age").alias("age"),
        (pl.col("t_age") - pl.col("b_age")).alias("age_delta"),
        pl.concat_list(field_changes).list.drop_nulls().alias("corrected_fields"),
    )
    events = pl.concat(
        [deletions, additions, transfers_out, transfers_in], how="vertical"
    ).with_columns(
        pl.lit(None, pl.Int32).alias("age_delta"),
        pl.lit([], pl.List(pl.String)).alias("corrected_fields"),
    )
    changes = pl.concat([events, continuing], how="vertical").sort(
        ["ac_code", "part_no", "change", "record_key"]
    )
    return RollDiff(changes=changes, elapsed_years=elapsed)
