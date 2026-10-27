"""From rule candidates to public findings (B04.06, B04.07, B05).

Code computes every number; templates only explain them. Each finding carries its evidence,
baseline, criterion, signal strength, innocent explanations and limitations, and every
explanation is checked against the banned-term list before it can leave this module.
"""

from collections import defaultdict
from dataclasses import dataclass
from typing import Any

from electralens_engine.analysis.aggregates import part_code
from electralens_engine.analysis.rules import Candidate, Context, sci
from electralens_engine.analysis.stats import benjamini_hochberg
from electralens_engine.explain.banned import find_banned
from electralens_engine.explain.render import catalogue, locales, render, render_key
from electralens_engine.methodology import number
from electralens_engine.schemas import validator

ALTERNATIVES: dict[str, list[str]] = {
    "R01": ["alt.pending_deletion", "alt.re_registration", "alt.data_entry_repeat"],
    "R02": [
        "alt.transliteration_variant",
        "alt.similar_names",
        "alt.family_members",
        "alt.re_registration",
    ],
    "R03": ["alt.data_entry_error", "alt.age_other_date"],
    "R04": ["alt.form8_correction", "alt.earlier_error_fixed"],
    "R05": [
        "alt.house_to_house_verification",
        "alt.migration",
        "alt.death_record_catch_up",
        "alt.part_reorganisation",
        "alt.duplicate_cleanup",
    ],
    "R06": [
        "alt.new_housing",
        "alt.enrolment_drive",
        "alt.first_time_voters",
        "alt.part_reorganisation",
    ],
    "R07": ["alt.polling_station_rationalisation", "alt.boundary_update"],
    "R08": ["alt.institution", "alt.joint_family", "alt.placeholder_house_number"],
    "R09": ["alt.marriage_migration", "alt.targeted_enrolment", "alt.small_part"],
    "R10": ["alt.batch_entry_quality", "alt.source_format_issue"],
    "R11": [
        "alt.death_registration_drive",
        "alt.verification_campaign",
        "alt.house_to_house_verification",
    ],
    "R12": ["alt.enrolment_drive", "alt.qualifying_date_effect", "alt.first_time_voters"],
}
LIMITATIONS: dict[str, list[str]] = {
    "R01": ["lim.row_evidence_restricted", "lim.within_part_only"],
    "R02": ["lim.row_evidence_restricted", "lim.fuzzy_matching", "lim.within_part_only"],
    "R03": ["lim.row_evidence_restricted"],
    "R04": ["lim.row_evidence_restricted"],
    "R05": ["lim.statistical_not_causal"],
    "R06": ["lim.statistical_not_causal"],
    "R07": [],
    "R08": ["lim.row_evidence_restricted"],
    "R09": ["lim.statistical_not_causal"],
    "R10": ["lim.row_evidence_restricted"],
    "R11": ["lim.statistical_not_causal", "lim.reason_codes_as_recorded"],
    "R12": ["lim.statistical_not_causal"],
}
RULE_VERSION_DEFAULT = "1.0.0"


class BannedTermError(ValueError):
    pass


@dataclass(frozen=True)
class Outcome:
    findings: list[dict[str, Any]]
    restricted: list[dict[str, Any]]
    tests_in_run: dict[str, int]


def signal_strength(
    candidate: Candidate, q: float | None, methodology: dict[str, Any]
) -> str | None:
    """Strength of an eligible finding, or None when it doesn't qualify as a finding."""
    if not candidate.statistical:
        return "data_quality"
    if not candidate.eligible or q is None or candidate.effect is None:
        return None
    if q >= number(methodology["fdr_q"]):
        return None
    for level in ("strong", "moderate"):
        threshold = methodology["signal"][level]
        if q < number(threshold["q"]) and candidate.effect >= number(threshold["effect"]):
            return level
    return "weak"


def area_labels(areas: list[dict[str, Any]]) -> dict[str, dict[str, str]]:
    """Localized display names for every part and constituency."""
    ac_names = {a["code"]: a["name"] for a in areas if a["level"] == "ac"}
    labels: dict[str, dict[str, str]] = {}
    for a in areas:
        if a["level"] == "part":
            part_no = int(a["code"].rsplit("-P", 1)[1])
            ac_name = ac_names[a["parent"]]
            labels[a["code"]] = {
                loc: render_key("area.part", {"part_no": part_no, "ac_name": ac_name}, loc)
                for loc in locales()
            }
        elif a["level"] == "ac":
            labels[a["code"]] = {
                loc: render_key("area.ac", {"ac_name": a["name"]}, loc) for loc in locales()
            }
    return labels


def _explanation(candidate: Candidate, params: dict[str, Any], strength: str) -> dict[str, str]:
    texts = {}
    for loc in locales():
        cat = catalogue(loc)
        text = " ".join(
            [render(cat[candidate.template], params, loc), cat[f"signal.{strength}"], cat["footer"]]
        )
        banned = find_banned(text)
        if banned:
            raise BannedTermError(f"{candidate.rule} explanation contains banned terms: {banned}")
        texts[loc] = text
    return texts


def build_findings(
    candidates: list[Candidate], ctx: Context, areas: list[dict[str, Any]], finding_year: int
) -> Outcome:
    methodology = ctx.methodology
    by_rule: dict[str, list[Candidate]] = defaultdict(list)
    for c in candidates:
        by_rule[c.rule].append(c)

    q_values: dict[int, float] = {}
    tests_in_run: dict[str, int] = {}
    for rule, group in sorted(by_rule.items()):
        if group[0].statistical:
            qs = benjamini_hochberg([c.p_value if c.p_value is not None else 1.0 for c in group])
            for c, q in zip(group, qs, strict=True):
                q_values[id(c)] = q
            tests_in_run[rule] = len(group)
        else:
            tests_in_run[rule] = int(ctx.parts.height)

    labels = area_labels(areas)
    selected = []
    for c in candidates:
        q = q_values.get(id(c))
        strength = signal_strength(c, q, methodology)
        if strength is not None:
            selected.append((c, q, strength))
    selected.sort(key=lambda item: (item[0].rule, item[0].area_code))

    findings, restricted = [], []
    synthetic = ctx.baseline.is_synthetic and ctx.target.is_synthetic
    for index, (c, q, strength) in enumerate(selected, start=1):
        finding_id = f"F-{finding_year:04d}-{index:06d}"
        evidence = dict(c.evidence)
        params = dict(c.params)
        if c.statistical and q is not None and c.p_value is not None:
            evidence |= {
                "p_value": sci(c.p_value),
                "q_value": sci(q),
                "tests_in_run": tests_in_run[c.rule],
            }
            params |= {"q_value": sci(q)}
        params["area"] = labels.get(c.area_code, {"en": c.area_code})
        rule_params = methodology["rules"][c.rule]
        finding = {
            "finding_id": finding_id,
            "rule": {
                "id": c.rule,
                "version": rule_params.get("version", RULE_VERSION_DEFAULT),
                "name_key": f"rule.{c.rule}.name",
            },
            "datasets": {"baseline": ctx.baseline.version_id, "target": ctx.target.version_id},
            "area": {"level": "part", "code": part_code(c.ac_code, c.part_no)},
            "evidence": evidence,
            "baseline": c.baseline,
            "criterion": c.criterion,
            "signal_strength": strength,
            "explanation": _explanation(c, params, strength),
            "alternative_explanations": ALTERNATIVES[c.rule],
            "limitations": [*LIMITATIONS[c.rule], *(["lim.synthetic_data"] if synthetic else [])],
            "review": {"status": "pending", "reviewed_at": None},
            "label": "analytical_finding",
        }
        validator("finding_v1")(finding)
        findings.append(finding)
        if c.restricted:
            restricted.append(
                {
                    "finding_id": finding_id,
                    "rule": c.rule,
                    "area_code": c.area_code,
                    "rows": c.restricted,
                }
            )
    return Outcome(findings=findings, restricted=restricted, tests_in_run=tests_in_run)
