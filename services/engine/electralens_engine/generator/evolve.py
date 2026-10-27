"""Normal year-on-year change from one roll version to the next (no anomalies).

Rates vary by part through random multipliers, so the data is overdispersed the way real
rolls are and the statistics in the audit engine have something realistic to work against.
"""

from collections import defaultdict

from electralens_engine.generator.model import Elector, Rng
from electralens_engine.generator.names import LATIN_VARIANTS
from electralens_engine.generator.population import Population

# Annual mortality by age band.
MORTALITY = [(18, 39, 0.0015), (40, 59, 0.005), (60, 69, 0.015), (70, 79, 0.04), (80, 200, 0.10)]
SHIFT_OUT = 0.025
ABSENT = 0.003
REPEATED = 0.001
FIRST_TIME_VOTERS = 0.022
SHIFT_IN = 0.025
SPELLING_FIX = 0.005
HOUSE_FIX = 0.003
AGE_FIX = 0.001


def _mortality(age: int) -> float:
    return next(rate for low, high, rate in MORTALITY if low <= age <= high)


def by_part(electors: list[Elector]) -> dict[tuple[str, int], list[Elector]]:
    groups: dict[tuple[str, int], list[Elector]] = defaultdict(list)
    for e in electors:
        groups[(e.ac_code, e.part_no)].append(e)
    return dict(sorted(groups.items()))


def active(electors: list[Elector]) -> list[Elector]:
    return [e for e in electors if e.status == "active"]


def variant_name(e: Elector, rng: Rng) -> str | None:
    """The elector's Latin name with one spelling variant swapped in, if a variant exists."""
    for part in (e.first_latin, e.surname_latin):
        if part in LATIN_VARIANTS:
            return e.name_latin.replace(part, rng.choice(LATIN_VARIANTS[part]), 1)
    return None


def first_time_voter(pop: Population, parent: Elector, age: int = 18) -> Elector:
    """A new elector who has just turned 18 in an existing household."""
    gender = "M" if pop.rng.chance(0.5) else "F"
    relation = "F" if parent.gender == "M" else "M"
    return pop.person(
        parent.ac_code,
        parent.part_no,
        gender,
        age,
        parent.family,
        parent.house_no,
        relation,
        (parent.name_latin, parent.name_local),
    )


def shift_in(pop: Population, ac_code: str, part_no: int, count: int) -> list[Elector]:
    """New households moving into the part, `count` electors in total."""
    newcomers: list[Elector] = []
    while len(newcomers) < count:
        newcomers += pop.household(ac_code, part_no, max_size=min(3, count - len(newcomers)))
    return newcomers


def evolve(rng: Rng, pop: Population, previous: list[Elector]) -> list[Elector]:
    """Next roll version: everyone a year older, plus deaths, moves, enrolments, corrections."""
    current = [e.copy(age=e.age + 1) for e in active(previous)]
    for (ac_code, part_no), electors in by_part(current).items():
        loss = 0.6 + rng.unit() * 0.9  # per-part multipliers (overdispersion)
        gain = 0.6 + rng.unit() * 0.9
        for e in electors:
            if rng.chance(_mortality(e.age) * loss):
                e.status, e.deletion_reason = "deleted", "D"
            elif rng.chance(SHIFT_OUT * loss):
                e.status, e.deletion_reason = "deleted", "S"
            elif rng.chance(ABSENT * loss):
                e.status, e.deletion_reason = "deleted", "A"
            elif rng.chance(REPEATED * loss):
                e.status, e.deletion_reason = "deleted", "R"
            elif rng.chance(SPELLING_FIX) and (fixed := variant_name(e, rng)):
                e.name_latin = fixed
            elif rng.chance(HOUSE_FIX):
                e.house_no = pop.new_house(ac_code, part_no)
            elif rng.chance(AGE_FIX):
                e.age += rng.choice([-1, 1])  # stays within the R04 tolerance of one year

        size = len(electors)
        parents = [e for e in active(electors) if 38 <= e.age <= 65 and e.house_no]
        first_timers = sum(rng.chance(FIRST_TIME_VOTERS * gain) for _ in range(size))
        for _ in range(first_timers if parents else 0):
            current.append(first_time_voter(pop, rng.choice(parents)))
        movers = sum(rng.chance(SHIFT_IN * gain) for _ in range(size))
        current += shift_in(pop, ac_code, part_no, movers)
    return current
