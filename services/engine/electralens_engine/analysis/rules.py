"""The rule catalogue R01-R12 (Architecture §9.1, methodology 2026.1).

Each rule is a pure function of the run context. Every rule tests every part it applies to;
there is no way to point a rule at chosen areas (FR-AUD-9). Statistical rules return a
candidate for each tested part, so the false-discovery correction sees all the tests.
"""

import math
from collections.abc import Callable
from dataclasses import dataclass, field
from typing import Any

import numpy as np
import polars as pl
from rapidfuzz.distance import JaroWinkler

from electralens_engine.analysis.aggregates import part_code
from electralens_engine.analysis.diff import RollDiff
from electralens_engine.analysis.load import RollVersion
from electralens_engine.analysis.stats import (
    beta_binomial_upper,
    binomial_upper,
    fisher_two_sided,
    robust_rate_baseline,
    wilson_interval,
)
from electralens_engine.methodology import number
from electralens_engine.namekey import name_key

REASON_NAMES = {"D": "dead", "S": "shifted", "A": "absent", "R": "repeated"}


def dec6(x: float) -> str:
    s = f"{x:.6f}"
    return "0.000000" if s == "-0.000000" else s


def sci(p: float) -> str:
    return f"{p:.2e}"


def half_up(x: float) -> int:
    return math.floor(x + 0.5)


@dataclass(frozen=True)
class Context:
    baseline: RollVersion
    target: RollVersion
    diff: RollDiff
    parts: pl.DataFrame
    methodology: dict[str, Any]

    def params(self, rule: str) -> dict[str, Any]:
        return self.methodology["rules"][rule]

    @property
    def fdr_q(self) -> str:
        return self.methodology["fdr_q"]

    @property
    def min_part_electors(self) -> int:
        return int(self.methodology["min_part_electors"])

    def tested_parts(self) -> pl.DataFrame:
        return self.parts.filter(pl.col("electors_baseline") >= self.min_part_electors)


@dataclass
class Candidate:
    rule: str
    template: str
    ac_code: str
    part_no: int
    evidence: dict[str, int | str]
    params: dict[str, Any]
    baseline: dict[str, Any] | None
    criterion: str
    statistical: bool
    eligible: bool
    p_value: float | None = None
    effect: float | None = None
    restricted: list[dict[str, Any]] = field(default_factory=list)

    @property
    def area_code(self) -> str:
        return part_code(self.ac_code, self.part_no)


# ---- statistical rules -------------------------------------------------------------------


def _rate_rule(ctx: Context, rule: str, column: str) -> list[Candidate]:
    """Rate of `column` per elector on the earlier roll, against the constituency's parts."""
    p = ctx.params(rule)
    min_effect, min_count = number(p["min_effect"]), int(p["min_count"])
    criterion = f"q<{ctx.fdr_q} AND rate_ratio>={p['min_effect']} AND {column}>={min_count}"
    parts = ctx.tested_parts()
    out = []
    for ac in sorted(parts["ac_code"].unique().to_list()):
        group = parts.filter(pl.col("ac_code") == ac).sort("part_no")
        base = robust_rate_baseline(group[column].to_list(), group["electors_baseline"].to_list())
        for row in group.iter_rows(named=True):
            k, n = int(row[column]), int(row["electors_baseline"])
            rate = k / n
            ratio = rate / base.rate
            low, high = wilson_interval(k, n)
            evidence: dict[str, int | str] = {
                column: k,
                "electors_baseline": n,
                "rate": dec6(rate),
                "rate_ci95_low": dec6(low),
                "rate_ci95_high": dec6(high),
                "expected_rate": dec6(base.rate),
                "rate_ratio": dec6(ratio),
            }
            out.append(
                Candidate(
                    rule=rule,
                    template=f"rule.{rule}.template",
                    ac_code=ac,
                    part_no=int(row["part_no"]),
                    evidence=evidence,
                    params=dict(evidence),
                    baseline={
                        "type": "constituency_parts",
                        "n_units": base.n_units,
                        "method": "beta_binomial",
                    },
                    criterion=criterion,
                    statistical=True,
                    eligible=ratio >= min_effect and k >= min_count,
                    p_value=beta_binomial_upper(k, n, base),
                    effect=ratio,
                )
            )
    return out


def r05_deletion_rate(ctx: Context) -> list[Candidate]:
    return _rate_rule(ctx, "R05", "deletions")


def r06_addition_rate(ctx: Context) -> list[Candidate]:
    return _rate_rule(ctx, "R06", "additions")


def r12_first_time_voters(ctx: Context) -> list[Candidate]:
    return _rate_rule(ctx, "R12", "additions_18_19")


def r09_gender_skew(ctx: Context) -> list[Candidate]:
    p = ctx.params("R09")
    min_effect, min_shift, min_count = (
        number(p["min_effect"]),
        int(p["min_shift_per_1000"]),
        int(p["min_count"]),
    )
    criterion = (
        f"q<{ctx.fdr_q} AND deletion_rate_ratio>={p['min_effect']} "
        f"AND |shift_per_1000|>={min_shift} AND deletions>={min_count}"
    )
    out = []
    for row in ctx.tested_parts().iter_rows(named=True):
        fb, mb = int(row["baseline_F"]), int(row["baseline_M"])
        fd, md = int(row["deletions_F"]), int(row["deletions_M"])
        ft, mt = int(row["target_F"]), int(row["target_M"])
        if fb == 0 or mb == 0 or mt == 0:
            continue
        rf, rm = fd / fb, md / mb
        pad = 0.5 / min(fb, mb)
        effect = (max(rf, rm) + pad) / (min(rf, rm) + pad)
        ratio_b, ratio_t = half_up(1000 * fb / mb), half_up(1000 * ft / mt)
        evidence: dict[str, int | str] = {
            "women_baseline": fb,
            "women_deleted": fd,
            "women_rate": dec6(rf),
            "men_baseline": mb,
            "men_deleted": md,
            "men_rate": dec6(rm),
            "deletion_rate_ratio": dec6(effect),
            "women_per_1000_men_baseline": ratio_b,
            "women_per_1000_men_target": ratio_t,
            "shift_per_1000": ratio_t - ratio_b,
        }
        params = {**evidence, "ratio_baseline": ratio_b, "ratio_target": ratio_t}
        out.append(
            Candidate(
                rule="R09",
                template="rule.R09.template",
                ac_code=row["ac_code"],
                part_no=int(row["part_no"]),
                evidence=evidence,
                params=params,
                baseline={"type": "same_part_other_gender", "n_units": 1, "method": "fisher_exact"},
                criterion=criterion,
                statistical=True,
                eligible=effect >= min_effect
                and abs(ratio_t - ratio_b) >= min_shift
                and fd + md >= min_count,
                p_value=fisher_two_sided(fd, fb - fd, md, mb - md),
                effect=effect,
            )
        )
    return out


def r11_reason_mix(ctx: Context) -> list[Candidate]:
    p = ctx.params("R11")
    min_effect, min_deletions, min_count = (
        number(p["min_effect"]),
        int(p["min_deletions"]),
        int(p["min_count"]),
    )
    criterion = (
        f"q<{ctx.fdr_q} AND share_ratio>={p['min_effect']} "
        f"AND deletions>={min_deletions} AND reason_count>={min_count}"
    )
    reasons = list(REASON_NAMES)
    parts = ctx.tested_parts()
    out = []
    for ac in sorted(parts["ac_code"].unique().to_list()):
        group = parts.filter(pl.col("ac_code") == ac).sort("part_no")
        totals = np.array([group[f"deletions_{r}"].sum() for r in reasons], dtype=float)
        for row in group.iter_rows(named=True):
            counts = np.array([row[f"deletions_{r}"] for r in reasons], dtype=float)
            total = int(counts.sum())
            others = totals - counts
            if total < min_deletions or others.sum() == 0:
                continue
            best: tuple[float, str, int, float, float] | None = None
            for r, count, other in zip(reasons, counts, others, strict=True):
                share = max(other / others.sum(), 0.5 / others.sum())
                p_r = binomial_upper(int(count), total, share)
                if best is None or p_r < best[0]:
                    best = (p_r, r, int(count), share, (count / total) / share)
            assert best is not None  # noqa: S101 - reasons is never empty
            p_r, reason, count, share, effect = best
            evidence: dict[str, int | str] = {
                "deletions": total,
                "reason": reason,
                "reason_count": count,
                "reason_share": dec6(count / total),
                "expected_share": dec6(share),
                "share_ratio": dec6(effect),
                **{
                    f"deletions_{REASON_NAMES[r]}": int(c)
                    for r, c in zip(reasons, counts, strict=True)
                },
            }
            out.append(
                Candidate(
                    rule="R11",
                    template="rule.R11.template",
                    ac_code=ac,
                    part_no=int(row["part_no"]),
                    evidence=evidence,
                    params=dict(evidence),
                    baseline={
                        "type": "constituency_parts",
                        "n_units": group.height - 1,
                        "method": "binomial_per_reason",
                    },
                    criterion=criterion,
                    statistical=True,
                    eligible=effect >= min_effect and count >= min_count,
                    p_value=min(1.0, p_r * len(reasons)),  # Bonferroni over the four reasons
                    effect=effect,
                )
            )
    return out


# ---- record-level rules ------------------------------------------------------------------


def _record_candidate(
    rule: str,
    ac: str,
    part: int,
    evidence: dict[str, int | str],
    criterion: str,
    restricted: list[dict[str, Any]],
    params: dict[str, Any] | None = None,
    template: str | None = None,
    baseline: dict[str, Any] | None = None,
) -> Candidate:
    return Candidate(
        rule=rule,
        template=template or f"rule.{rule}.template",
        ac_code=ac,
        part_no=part,
        evidence=evidence,
        params={**evidence, **(params or {})},
        baseline=baseline,
        criterion=criterion,
        statistical=False,
        eligible=True,
        restricted=restricted,
    )


def r01_exact_duplicates(ctx: Context) -> list[Candidate]:
    # Only complete entries: two entries that are identical because details are missing are
    # rule R10's concern, not proof of a repeated person.
    t = (
        ctx.target.active()
        .filter(
            pl.col("house_no").is_not_null()
            & pl.col("relative_name_latin").is_not_null()
            & pl.col("relative_name_local").is_not_null()
        )
        .with_columns(
            pl.col("name_latin").str.to_lowercase().alias("_n"),
            pl.col("relative_name_latin").str.to_lowercase().alias("_r"),
        )
    )
    keys = [
        "ac_code",
        "part_no",
        "_n",
        "name_local",
        "_r",
        "relative_name_local",
        "age",
        "gender",
        "house_no",
    ]
    groups = (
        t.group_by(keys)
        .agg(pl.col("record_key").sort().alias("record_keys"), pl.len().alias("size"))
        .filter(pl.col("size") >= 2)
        .sort(["ac_code", "part_no", "record_keys"])
    )
    out = []
    for (ac, part), g in groups.group_by(["ac_code", "part_no"], maintain_order=True):
        evidence: dict[str, int | str] = {
            "duplicate_groups": g.height,
            "records_involved": int(g["size"].sum()),
        }
        restricted = [{"record_keys": keys} for keys in g["record_keys"].to_list()]
        out.append(
            _record_candidate(
                "R01",
                str(ac),
                int(part),
                evidence,
                "same name, relative's name, age, gender and house number within a part",
                restricted,
            )
        )
    return out


def r02_likely_duplicates(ctx: Context) -> list[Candidate]:
    """Same phonetic name key and relative's key, same gender, ages close, not identical."""
    p = ctx.params("R02")
    gap = int(p["max_age_gap"])
    t = (
        ctx.target.active()
        .filter(pl.col("relative_name_latin").is_not_null())
        .sort("record_key")
        .with_columns(
            pl.col("name_latin").map_elements(name_key, return_dtype=pl.String).alias("_nk"),
            pl.col("relative_name_latin")
            .map_elements(name_key, return_dtype=pl.String)
            .alias("_rk"),
            pl.col("house_no").fill_null("").alias("_h"),
        )
    )
    pairs: dict[tuple[str, int], list[dict[str, Any]]] = {}
    for block in t.partition_by(
        ["ac_code", "part_no", "gender", "_nk", "_rk"], maintain_order=True
    ):
        if block.height < 2:
            continue
        rows = block.select("record_key", "name_latin", "relative_name_latin", "age", "_h").rows()
        for i in range(len(rows)):
            for j in range(i + 1, len(rows)):
                (ki, ni, ri, ai, hi), (kj, nj, rj, aj, hj) = rows[i], rows[j]
                if abs(ai - aj) > gap:
                    continue
                if ni.lower() == nj.lower() and ri.lower() == rj.lower() and ai == aj and hi == hj:
                    continue  # an exact duplicate: rule R01's job
                key = (block["ac_code"][0], int(block["part_no"][0]))
                pairs.setdefault(key, []).append(
                    {
                        "record_keys": sorted([ki, kj]),
                        "name_similarity": dec6(
                            JaroWinkler.normalized_similarity(ni.lower(), nj.lower())
                        ),
                        "age_gap": abs(ai - aj),
                    }
                )
    out = []
    criterion = (
        f"same {p['matching']} name and relative keys, same gender, age_gap<={gap}, within a part"
    )
    for (ac, part), found in sorted(pairs.items()):
        evidence: dict[str, int | str] = {"pairs": len(found)}
        out.append(
            _record_candidate("R02", ac, part, evidence, criterion, found, {"max_age_gap": gap})
        )
    return out


def r03_impossible_ages(ctx: Context) -> list[Candidate]:
    p = ctx.params("R03")
    low, high = int(p["min_age"]), int(p["max_age"])
    bad = (
        ctx.target.active()
        .filter((pl.col("age") < low) | (pl.col("age") > high))
        .sort("record_key")
    )
    out = []
    for (ac, part), g in bad.group_by(["ac_code", "part_no"], maintain_order=True):
        under = int((g["age"] < low).sum())
        evidence: dict[str, int | str] = {
            "impossible_ages": g.height,
            "under_min": under,
            "over_max": g.height - under,
        }
        restricted = [
            {"record_key": k, "age": a} for k, a in zip(g["record_key"], g["age"], strict=True)
        ]
        out.append(
            _record_candidate(
                "R03",
                str(ac),
                int(part),
                evidence,
                f"age<{low} OR age>{high} on the qualifying date",
                restricted,
                {"min_age": low, "max_age": high},
            )
        )
    return sorted(out, key=lambda c: c.area_code)


def r04_age_drift(ctx: Context) -> list[Candidate]:
    tol = int(ctx.params("R04")["tolerance_years"])
    elapsed = ctx.diff.elapsed_years
    jumps = ctx.diff.changes.filter(
        (pl.col("change") == "continuing") & ((pl.col("age_delta") - elapsed).abs() > tol)
    ).sort("record_key")
    out = []
    for (ac, part), g in jumps.group_by(["ac_code", "part_no"], maintain_order=True):
        evidence: dict[str, int | str] = {"age_jumps": g.height, "elapsed_years": dec6(elapsed)}
        restricted = [
            {"record_key": k, "age_delta": d}
            for k, d in zip(g["record_key"], g["age_delta"], strict=True)
        ]
        out.append(
            _record_candidate(
                "R04",
                str(ac),
                int(part),
                evidence,
                f"|age change - elapsed years| > {tol}",
                restricted,
                {"elapsed": dec6(elapsed), "tolerance": tol},
            )
        )
    return sorted(out, key=lambda c: c.area_code)


def r07_part_changes(ctx: Context) -> list[Candidate]:
    ch = ctx.diff.changes
    moves = (
        ch.filter(pl.col("change") == "transfer_out")
        .select(
            "record_key", pl.col("ac_code").alias("from_ac"), pl.col("part_no").alias("from_part")
        )
        .join(ch.filter(pl.col("change") == "transfer_in"), on="record_key")
    )
    out = []
    for row in ctx.parts.iter_rows(named=True):
        ac, part = row["ac_code"], int(row["part_no"])
        if row["electors_baseline"] == 0 and row["electors_target"] > 0:
            sources = (
                moves.filter((pl.col("ac_code") == ac) & (pl.col("part_no") == part))
                .group_by(["from_ac", "from_part"])
                .len()
                .sort(["len", "from_ac", "from_part"], descending=[True, False, False])
            )
            evidence: dict[str, int | str] = {
                "electors_target": int(row["electors_target"]),
                "transfers_in": int(row["transfers_in"]),
                "additions": int(row["additions"]),
                "source_parts": sources.height,
            }
            if sources.height:
                evidence["main_source_part"] = part_code(
                    sources["from_ac"][0], int(sources["from_part"][0])
                )
            out.append(
                _record_candidate(
                    "R07",
                    ac,
                    part,
                    evidence,
                    "part on the newer roll only",
                    [],
                    template="rule.R07.template.appeared",
                )
            )
        elif row["electors_baseline"] > 0 and row["electors_target"] == 0:
            evidence = {
                "electors_baseline": int(row["electors_baseline"]),
                "transfers_out": int(row["transfers_out"]),
                "deletions": int(row["deletions"]),
            }
            out.append(
                _record_candidate(
                    "R07",
                    ac,
                    part,
                    evidence,
                    "part on the earlier roll only",
                    [],
                    template="rule.R07.template.disappeared",
                )
            )
    return out


def r08_high_occupancy(ctx: Context) -> list[Candidate]:
    p = ctx.params("R08")
    min_electors, percentile = int(p["min_electors"]), number(p["percentile"])
    houses = (
        ctx.target.active()
        .filter(pl.col("house_no").is_not_null())
        .group_by(["ac_code", "part_no", "house_no"])
        .agg(pl.len().alias("electors"), pl.col("record_key").sort().alias("record_keys"))
        .sort(["ac_code", "part_no", "house_no"])
    )
    out = []
    for ac in sorted(houses["ac_code"].unique().to_list()):
        in_ac = houses.filter(pl.col("ac_code") == ac)
        threshold = int(np.floor(np.quantile(in_ac["electors"].to_numpy(), percentile)))
        flagged = in_ac.filter(
            (pl.col("electors") > threshold) & (pl.col("electors") >= min_electors)
        )
        for (part,), g in flagged.group_by(["part_no"], maintain_order=True):
            evidence: dict[str, int | str] = {
                "addresses": g.height,
                "max_at_one_address": int(g["electors"].max()),  # type: ignore[arg-type]
                "threshold": threshold,
            }
            restricted = [
                {"house_no": h, "electors": n, "record_keys": k}
                for h, n, k in zip(
                    g["house_no"].to_list(),
                    g["electors"].to_list(),
                    g["record_keys"].to_list(),
                    strict=True,
                )
            ]
            out.append(
                _record_candidate(
                    "R08",
                    ac,
                    int(part),
                    evidence,
                    f"electors at one house number > constituency p{p['percentile']} "
                    f"AND >= {min_electors}",
                    restricted,
                    baseline={
                        "type": "constituency_addresses",
                        "n_units": in_ac.height,
                        "method": "percentile",
                    },
                )
            )
    return out


def r10_missing_details(ctx: Context) -> list[Candidate]:
    p = ctx.params("R10")
    min_share, percentile = number(p["min_share"]), number(p["percentile"])
    parts = ctx.parts.filter(pl.col("electors_target") > 0).with_columns(
        (pl.col("missing_fields") / pl.col("electors_target")).alias("missing_share")
    )
    missing_rows = ctx.target.active().filter(
        pl.any_horizontal(
            pl.col("house_no").is_null(),
            pl.col("relative_name_latin").is_null(),
            pl.col("relative_name_local").is_null(),
            pl.col("relation_type").is_null(),
        )
    )
    out = []
    for ac in sorted(parts["ac_code"].unique().to_list()):
        group = parts.filter(pl.col("ac_code") == ac).sort("part_no")
        cut = max(min_share, float(np.quantile(group["missing_share"].to_numpy(), percentile)))
        for row in group.iter_rows(named=True):
            share_hit = row["missing_fields"] > 0 and row["missing_share"] >= cut
            if not (
                share_hit or row["deletions_unspecified"] > 0 or row["deletions_unrecorded"] > 0
            ):
                continue
            part = int(row["part_no"])
            evidence: dict[str, int | str] = {
                "missing_fields": int(row["missing_fields"]),
                "electors_target": int(row["electors_target"]),
                "missing_share": dec6(row["missing_share"]),
                "threshold_share": dec6(cut),
                "deletions_unspecified": int(row["deletions_unspecified"]),
                "deletions_unrecorded": int(row["deletions_unrecorded"]),
            }
            keys = missing_rows.filter((pl.col("ac_code") == ac) & (pl.col("part_no") == part))[
                "record_key"
            ]
            out.append(
                _record_candidate(
                    "R10",
                    ac,
                    part,
                    evidence,
                    f"missing_share>=max({p['min_share']}, constituency p{p['percentile']}) "
                    "OR any deletion without a reason or record",
                    [{"record_keys": sorted(keys.to_list())}],
                    baseline={
                        "type": "constituency_parts",
                        "n_units": group.height,
                        "method": "percentile",
                    },
                )
            )
    return out


RULES: list[tuple[str, Callable[[Context], list[Candidate]]]] = [
    ("R01", r01_exact_duplicates),
    ("R02", r02_likely_duplicates),
    ("R03", r03_impossible_ages),
    ("R04", r04_age_drift),
    ("R05", r05_deletion_rate),
    ("R06", r06_addition_rate),
    ("R07", r07_part_changes),
    ("R08", r08_high_occupancy),
    ("R09", r09_gender_skew),
    ("R10", r10_missing_details),
    ("R11", r11_reason_mix),
    ("R12", r12_first_time_voters),
]
