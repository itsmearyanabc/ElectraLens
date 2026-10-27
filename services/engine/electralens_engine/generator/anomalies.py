"""Labelled anomalies injected into the synthetic roll, with a ground-truth record (FR-AUD-7).

Each entry says which rule should fire where (`detect`), where a second rule may fire
legitimately (`acceptable`), and where a rule must stay quiet (`must_not`, negative controls).
Some injected patterns are innocent on purpose, so explanations can be judged too.
"""

from dataclasses import dataclass
from typing import Any

from electralens_engine.generator.evolve import (
    active,
    by_part,
    first_time_voter,
    shift_in,
    variant_name,
)
from electralens_engine.generator.model import Elector, Rng
from electralens_engine.generator.names import LATIN_VARIANTS, SURNAMES
from electralens_engine.generator.population import Geography, Population

HOSTEL_HOUSE = "Hostel Block C"


@dataclass
class Truth:
    rule: str
    area_code: str
    expect: str  # detect | acceptable | must_not
    cause: str
    innocent: bool
    details: dict[str, Any]


class Injector:
    def __init__(self, rng: Rng, pop: Population, geo: Geography) -> None:
        self.rng = rng
        self.pop = pop
        self.geo = geo
        self.truth: list[Truth] = []
        self.used: set[tuple[str, int]] = set()

    def _record(
        self,
        rule: str,
        key: tuple[str, int],
        cause: str,
        details: dict[str, Any],
        expect: str = "detect",
        innocent: bool = False,
    ) -> None:
        code = self.geo.part_code(*key)
        self.truth.append(Truth(rule, code, expect, cause, innocent, details))

    def _take(
        self,
        groups: dict[tuple[str, int], list[Elector]],
        n: int,
        max_size: int | None = None,
        min_size: int | None = None,
    ) -> list[tuple[str, int]]:
        candidates = [
            key
            for key, electors in groups.items()
            if key not in self.used
            and (max_size is None or len(active(electors)) <= max_size)
            and (min_size is None or len(active(electors)) >= min_size)
        ]
        if len(candidates) < n:
            raise ValueError("not enough parts to inject anomalies; increase --acs or --parts-min")
        chosen = self.rng.sample(candidates, n)
        self.used.update(chosen)
        return chosen

    def _stranger(self, ac: str, part: int, age: int, house: str) -> Elector:
        surname = self.rng.choice(SURNAMES)
        gender = "M" if self.rng.chance(0.5) else "F"
        relative = self.pop.outside_relative(surname)
        return self.pop.person(ac, part, gender, age, surname, house, "F", relative)

    # ---- baseline (v1) ------------------------------------------------------------------

    def inject_baseline(self, v1: list[Elector]) -> None:
        """An innocent look-alike: a student hostel registers many electors at one address."""
        (key,) = self._take(by_part(v1), 1, max_size=1100)
        residents = [
            self._stranger(*key, age=self.rng.between(18, 24), house=HOSTEL_HOUSE)
            for _ in range(55)
        ]
        v1 += residents
        self._record(
            "R08",
            key,
            "institution_hostel",
            {"house_no": HOSTEL_HOUSE, "electors": 55},
            innocent=True,
        )

    # ---- revision (v2) ------------------------------------------------------------------

    def inject_revision(self, v1: list[Elector], v2: list[Elector]) -> None:
        rng, pop = self.rng, self.pop
        groups = by_part(v2)
        v1_keys = {e.record_key for e in v1}

        for key in self._take(groups, 3):  # R05: deletion spike
            electors = active(groups[key])
            victims = rng.sample(electors, round(len(electors) * (0.12 + rng.unit() * 0.08)))
            for e in victims:
                e.status, e.deletion_reason = "deleted", rng.weighted(["S", "A"], [0.6, 0.4])
            self._record("R05", key, "injected_deletion_spike", {"extra_deletions": len(victims)})
            # Many "absent" deletions also change the reason mix, so R11 may fire here too.
            self._record("R11", key, "injected_deletion_spike", {}, expect="acceptable")

        for key in self._take(groups, 2, max_size=1000):  # R06: addition spike
            n = round(len(active(groups[key])) * (0.12 + rng.unit() * 0.06))
            v2 += shift_in(pop, *key, n)
            self._record("R06", key, "injected_addition_spike", {"extra_additions": n})

        for key in self._take(groups, 2):  # R01: exact duplicates
            originals = rng.sample(active(groups[key]), rng.between(3, 5))
            for o in originals:
                epic = pop.new_epic(o.ac_code) if rng.chance(0.5) else None
                v2.append(o.copy(record_key=pop.new_key(), serial_no=0, epic_like=epic))
            self._record("R01", key, "injected_exact_duplicates", {"pairs": len(originals)})

        for key in self._take(groups, 2):  # R02: likely duplicates (spelling variant, age +/- 1)
            candidates = [
                e
                for e in active(groups[key])
                if e.first_latin in LATIN_VARIANTS or e.surname_latin in LATIN_VARIANTS
            ]
            originals = rng.sample(candidates, 3)
            for o in originals:
                house = o.house_no if rng.chance(0.5) else pop.new_house(*key)
                v2.append(
                    o.copy(
                        record_key=pop.new_key(),
                        serial_no=0,
                        epic_like=pop.new_epic(o.ac_code),
                        name_latin=variant_name(o, rng) or o.name_latin,
                        age=o.age + rng.choice([-1, 1]),
                        house_no=house,
                    )
                )
            self._record("R02", key, "injected_likely_duplicates", {"pairs": len(originals)})

        under_age, over_age = self._take(groups, 2)  # R03: impossible ages
        parents = [e for e in active(groups[under_age]) if 38 <= e.age <= 65 and e.house_no]
        for _ in range(2):
            v2.append(first_time_voter(pop, rng.choice(parents), age=rng.between(15, 16)))
        self._record("R03", under_age, "injected_under_age", {"electors": 2})
        v2.append(
            self._stranger(*over_age, age=rng.between(121, 140), house=pop.new_house(*over_age))
        )
        self._record("R03", over_age, "injected_over_age", {"electors": 1})

        (key,) = self._take(groups, 1)  # R04: ages that jump by seven years
        continuing = [e for e in active(groups[key]) if e.record_key in v1_keys]
        for e in rng.sample(continuing, 6):
            e.age += 6
        self._record("R04", key, "injected_age_drift", {"electors": 6, "jump_years": 7})

        sizes = sorted(len(active(electors)) for electors in groups.values())
        upper_quartile = sizes[len(sizes) * 3 // 4]
        (key,) = self._take(groups, 1, min_size=upper_quartile)  # R07: part split (innocent)
        ac = key[0]
        new_part = max(self.geo.parts_of(ac)) + 1
        self.geo.add_part(ac, new_part, "v2")
        electors = active(groups[key])
        houses = list(dict.fromkeys(e.house_no for e in electors if e.house_no))
        moved_houses = set(rng.sample(houses, round(len(houses) * 0.4)))
        moved = 0
        for e in electors:
            if e.house_no in moved_houses:
                e.part_no, e.serial_no = new_part, 0
                moved += 1
        details = {"from_part": self.geo.part_code(*key), "transferred": moved}
        self._record("R07", (ac, new_part), "part_reorganisation", details, innocent=True)
        self._record(
            "R05", key, "transfers_are_not_deletions", {}, expect="must_not", innocent=True
        )
        self._record(
            "R06",
            (ac, new_part),
            "transfers_are_not_additions",
            {},
            expect="must_not",
            innocent=True,
        )

        (key,) = self._take(groups, 1)  # R08: many unrelated electors at one house
        house = pop.new_house(*key)
        v2 += [self._stranger(*key, age=pop.adult_age(20, 70), house=house) for _ in range(32)]
        self._record("R08", key, "injected_high_occupancy", {"house_no": house, "electors": 32})
        self._record("R06", key, "injected_high_occupancy", {}, expect="acceptable")

        (key,) = self._take(groups, 1)  # R09: women removed disproportionately
        women = [e for e in active(groups[key]) if e.gender == "F"]
        victims = rng.sample(women, round(len(women) * 0.22))
        for e in victims:
            e.status, e.deletion_reason = "deleted", "S"
        self._record(
            "R09", key, "injected_gender_skewed_deletions", {"women_deleted": len(victims)}
        )
        self._record("R05", key, "injected_gender_skewed_deletions", {}, expect="acceptable")

        (key,) = self._take(groups, 1)  # R10: a batch with missing fields
        electors = active(groups[key])
        blanked = rng.sample(electors, round(len(electors) * 0.35))
        for e in blanked:
            e.house_no = e.relative_name_latin = e.relative_name_local = e.relation_type = None
        deleted = [e for e in groups[key] if e.status == "deleted"]
        for e in deleted[:3]:
            e.deletion_reason = None
        self._record(
            "R10",
            key,
            "injected_missing_fields",
            {"rows_missing_fields": len(blanked), "deletions_without_reason": min(3, len(deleted))},
        )

        (key,) = self._take(groups, 1)  # R11: deletion reasons dominated by deaths
        victims = rng.sample(active(groups[key]), round(len(groups[key]) * 0.06))
        for e in victims:
            e.status, e.deletion_reason = "deleted", "D"
        self._record("R11", key, "injected_reason_mix", {"extra_deaths": len(victims)})
        self._record("R05", key, "injected_reason_mix", {}, expect="acceptable")

        (key,) = self._take(groups, 1)  # R12: unusually many first-time voters
        parents = [e for e in active(groups[key]) if 38 <= e.age <= 65 and e.house_no]
        n = round(len(groups[key]) * 0.05)
        v2 += [first_time_voter(pop, rng.choice(parents)) for _ in range(n)]
        self._record("R12", key, "injected_cohort_spike", {"extra_first_time_voters": n})
        self._record("R06", key, "injected_cohort_spike", {}, expect="acceptable")

    def ground_truth(self) -> list[dict[str, Any]]:
        return [
            {
                "id": f"GT-{i:03d}",
                "rule": t.rule,
                "area_code": t.area_code,
                "expect": t.expect,
                "cause": t.cause,
                "innocent": t.innocent,
                "details": t.details,
            }
            for i, t in enumerate(self.truth, start=1)
        ]
