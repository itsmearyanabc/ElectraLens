"""Detection quality against the generator's ground truth (B04.10, FR-AUD-7, AC-8).

A finding is a true positive when the ground truth expects that rule in that part, neutral
when the injected pattern legitimately trips a second rule ("acceptable"), and a false
positive otherwise. "must_not" entries are negative controls and are reported separately.
"""

from collections import defaultdict
from typing import Any

from electralens_engine.analysis.rules import dec6


def benchmark(findings: list[dict[str, Any]], truth: list[dict[str, Any]]) -> dict[str, Any]:
    found = {(f["rule"]["id"], f["area"]["code"]) for f in findings}
    expected: dict[str, set[tuple[str, str]]] = defaultdict(set)
    for t in truth:
        expected[t["expect"]].add((t["rule"], t["area_code"]))
    detect, acceptable, must_not = expected["detect"], expected["acceptable"], expected["must_not"]

    rules = sorted({r for r, _ in found} | {r for r, _ in detect})
    per_rule = {}
    totals = {"tp": 0, "fp": 0, "fn": 0}
    for rule in rules:
        f = {x for x in found if x[0] == rule}
        d = {x for x in detect if x[0] == rule}
        tp, fn = len(f & d), len(d - f)
        fp_set = f - d - {x for x in acceptable if x[0] == rule}
        fp = len(fp_set)
        totals["tp"] += tp
        totals["fp"] += fp
        totals["fn"] += fn
        per_rule[rule] = {
            "true_positives": tp,
            "false_positives": fp,
            "false_negatives": fn,
            "precision": dec6(tp / (tp + fp)) if tp + fp else None,
            "recall": dec6(tp / (tp + fn)) if tp + fn else None,
            "false_positive_areas": sorted(a for _, a in fp_set),
            "missed_areas": sorted(a for _, a in d - f),
        }
    tp, fp, fn = totals["tp"], totals["fp"], totals["fn"]
    return {
        "per_rule": per_rule,
        "overall": {
            "true_positives": tp,
            "false_positives": fp,
            "false_negatives": fn,
            "precision": dec6(tp / (tp + fp)) if tp + fp else None,
            "recall": dec6(tp / (tp + fn)) if tp + fn else None,
        },
        "negative_control_violations": sorted(f"{r} {a}" for r, a in found & must_not),
        "note": (
            "Measured on synthetic data with injected anomalies of 2-5 times the normal rate. "
            "Real data and subtler patterns will be harder. No accuracy target is claimed."
        ),
    }
