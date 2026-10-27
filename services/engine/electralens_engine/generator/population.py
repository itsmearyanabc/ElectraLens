"""Geography and households for the baseline roll (v1).

States and districts are real Indian places, so the demo reads as Indian data. Everything
below district level is fictional and labelled DEMO: constituencies are numbered from 901
(no state has that many, so no code collides with a real assembly constituency), and booths
are invented facilities without coordinates. That way a synthetic anomaly can never be
mistaken for a finding about a real constituency or send a voter to a real building.
"""

from collections import defaultdict
from dataclasses import dataclass, field

from electralens_engine.generator.model import Area, Elector, Rng
from electralens_engine.generator.names import (
    FEMALE_FIRST,
    FEMALE_SECOND,
    MALE_FIRST,
    MALE_SECOND,
    SURNAMES,
)
from electralens_engine.namekey import name_key

POLLING_STATION_CAP = 1200  # electors per polling station (ECI cap reinstated in 2025)
FIRST_DEMO_AC_NUMBER = 901  # above every real assembly-constituency number in India


@dataclass(frozen=True)
class Region:
    code: str  # state abbreviation used in DEMO codes
    name: tuple[str, str]  # (English, Hindi)
    districts: tuple[tuple[str, str], ...]  # real districts, (English, Hindi)


# Hindi-speaking states, so the Devanagari names in the synthetic roll fit the place.
REGIONS: dict[str, Region] = {
    "HR": Region(
        "HR",
        ("Haryana", "हरियाणा"),
        (
            ("Gurugram", "गुरुग्राम"),
            ("Faridabad", "फ़रीदाबाद"),
            ("Rohtak", "रोहतक"),
            ("Sonipat", "सोनीपत"),
        ),
    ),
    "RJ": Region(
        "RJ",
        ("Rajasthan", "राजस्थान"),
        (("Jaipur", "जयपुर"), ("Jodhpur", "जोधपुर"), ("Udaipur", "उदयपुर"), ("Kota", "कोटा")),
    ),
    "MP": Region(
        "MP",
        ("Madhya Pradesh", "मध्य प्रदेश"),
        (("Bhopal", "भोपाल"), ("Indore", "इंदौर"), ("Gwalior", "ग्वालियर"), ("Jabalpur", "जबलपुर")),
    ),
    "UP": Region(
        "UP",
        ("Uttar Pradesh", "उत्तर प्रदेश"),
        (
            ("Lucknow", "लखनऊ"),
            ("Kanpur Nagar", "कानपुर नगर"),
            ("Varanasi", "वाराणसी"),
            ("Prayagraj", "प्रयागराज"),
        ),
    ),
}

# Adult age bands with approximate population weights (percent).
AGE_BANDS = [
    (18, 19, 4.0), (20, 29, 24.0), (30, 39, 21.0), (40, 49, 17.0), (50, 59, 14.0),
    (60, 69, 11.0), (70, 79, 6.0), (80, 89, 2.5), (90, 100, 0.5),
]  # fmt: skip
HOUSEHOLD_SIZES = [1, 2, 3, 4, 5, 6, 7]
HOUSEHOLD_WEIGHTS = [10, 30, 22, 18, 10, 6, 4]


@dataclass
class Geography:
    state: Area
    districts: list[Area]
    acs: list[Area]
    parts: list[Area]
    district_of: dict[str, Area]
    epic_prefix: dict[str, str]

    @staticmethod
    def part_code(ac_code: str, part_no: int) -> str:
        return f"{ac_code}-P{part_no:03d}"

    def ac(self, code: str) -> Area:
        return next(a for a in self.acs if a.code == code)

    def parts_of(self, ac_code: str) -> list[int]:
        return [int(p.code.rsplit("-P", 1)[1]) for p in self.parts if p.parent == ac_code]

    def add_part(self, ac_code: str, part_no: int, introduced_in: str) -> Area:
        area = Area(
            self.part_code(ac_code, part_no),
            "part",
            ac_code,
            {"en": f"Part {part_no}", "hi": f"भाग {part_no}"},
            introduced_in,
        )
        self.parts.append(area)
        return area

    def areas(self) -> list[Area]:
        return [self.state, *self.districts, *self.acs, *self.parts]


def build_geography(
    rng: Rng, acs: int, parts_min: int, parts_max: int, state: str = "HR"
) -> Geography:
    region = REGIONS[state]
    if not 1 <= acs <= 2 * len(region.districts):
        raise ValueError(f"acs must be between 1 and {2 * len(region.districts)}")
    state_code = f"DEMO-{region.code}"
    state_area = Area(state_code, "state", None, {"en": region.name[0], "hi": region.name[1]})
    districts = [
        Area(f"{state_code}-D{i + 1:02d}", "district", state_code, {"en": en, "hi": hi})
        for i, (en, hi) in enumerate(region.districts[: (acs + 1) // 2])
    ]
    geo = Geography(state_area, districts, [], [], {}, {})
    for i in range(acs):
        district = districts[i // 2]
        demo_no = i % 2 + 1
        code = f"{state_code}-AC{FIRST_DEMO_AC_NUMBER + i:03d}"
        ac = Area(
            code,
            "ac",
            district.code,
            {
                "en": f"{district.name['en']} DEMO-{demo_no}",
                "hi": f"{district.name['hi']} डेमो-{demo_no}",
            },
        )
        geo.acs.append(ac)
        geo.district_of[code] = district
        geo.epic_prefix[code] = "DM" + chr(ord("A") + i)
        for part_no in range(1, rng.between(parts_min, parts_max) + 1):
            geo.add_part(code, part_no, "v1")
    return geo


@dataclass
class Population:
    """Issues unique identifiers and builds households. Shared across roll versions."""

    rng: Rng
    geo: Geography
    keys: set[str] = field(default_factory=set)
    epic_next: dict[str, int] = field(default_factory=dict)
    house_next: dict[tuple[str, int], int] = field(default_factory=lambda: defaultdict(int))
    part_keys: dict[tuple[str, int], dict[tuple[str, str, str], list[int]]] = field(
        default_factory=lambda: defaultdict(dict)
    )

    def new_key(self) -> str:
        while True:
            key = self.rng.key()
            if key not in self.keys:
                self.keys.add(key)
                return key

    def new_epic(self, ac_code: str) -> str:
        if ac_code not in self.epic_next:
            self.epic_next[ac_code] = self.rng.between(1_000_000, 2_000_000)
        self.epic_next[ac_code] += 1
        return f"{self.geo.epic_prefix[ac_code]}{self.epic_next[ac_code]:07d}"

    def new_house(self, ac_code: str, part_no: int) -> str:
        self.house_next[(ac_code, part_no)] += 1
        number = str(self.house_next[(ac_code, part_no)])
        return f"{number}-{self.rng.choice('AB')}" if self.rng.chance(0.1) else number

    def adult_age(self, minimum: int = 18, maximum: int = 100) -> int:
        while True:
            low, high, _ = self.rng.weighted(AGE_BANDS, [w for _, _, w in AGE_BANDS])
            age = self.rng.between(low, high)
            if minimum <= age <= maximum:
                return age

    def full_name(
        self, gender: str, surname: tuple[str, str], avoid: set[str] | None = None
    ) -> tuple[str, str, str, str]:
        """(first_latin, surname_latin, name_latin, name_local)."""
        pool = MALE_FIRST if gender == "M" else FEMALE_FIRST
        if gender == "T":
            pool = MALE_FIRST + FEMALE_FIRST
        avoid = avoid or set()
        first = self.rng.choice(pool)
        while first[0] in avoid:
            first = self.rng.choice(pool)
        if gender == "F" and self.rng.chance(0.15):
            second = self.rng.choice(FEMALE_SECOND)
        elif gender == "M" and self.rng.chance(0.08):
            second = MALE_SECOND
        else:
            second = surname
        return first[0], second[0], f"{first[0]} {second[0]}", f"{first[1]} {second[1]}"

    def person(
        self,
        ac_code: str,
        part_no: int,
        gender: str,
        age: int,
        surname: tuple[str, str],
        house: str | None,
        relation: str | None,
        relative: tuple[str, str] | None,
        avoid: set[str] | None = None,
    ) -> Elector:
        # Two different people in one part never share the phonetic name key, relative's key,
        # gender and (roughly) age, so every such pair in the data is an injected duplicate
        # and the R02 benchmark stays meaningful.
        avoid = set(avoid or ())
        relative_key = name_key(relative[0]) if relative else ""
        registry = self.part_keys[(ac_code, part_no)]
        for _ in range(20):
            first, last, latin, local = self.full_name(gender, surname, avoid)
            identity = (gender, name_key(latin), relative_key)
            if all(abs(a - age) > 3 for a in registry.get(identity, [])):
                break
            avoid.add(first)
        registry.setdefault(identity, []).append(age)
        return Elector(
            record_key=self.new_key(),
            ac_code=ac_code,
            part_no=part_no,
            serial_no=0,
            name_latin=latin,
            name_local=local,
            relative_name_latin=relative[0] if relative else None,
            relative_name_local=relative[1] if relative else None,
            relation_type=relation,
            gender=gender,
            age=age,
            house_no=house,
            epic_like=self.new_epic(ac_code),
            first_latin=first,
            surname_latin=last,
            family=surname,
        )

    def outside_relative(self, surname: tuple[str, str]) -> tuple[str, str]:
        """Name of a relative who isn't on this roll (a late father or husband)."""
        first = self.rng.choice(MALE_FIRST)
        return f"{first[0]} {surname[0]}", f"{first[1]} {surname[1]}"

    def household(
        self, ac_code: str, part_no: int, max_size: int = 7, min_head_age: int = 25
    ) -> list[Elector]:
        rng = self.rng
        surname = rng.choice(SURNAMES)
        size = min(rng.weighted(HOUSEHOLD_SIZES, HOUSEHOLD_WEIGHTS), max_size)
        house = self.new_house(ac_code, part_no)
        used: set[str] = set()

        def add(gender: str, age: int, relation: str, relative: tuple[str, str]) -> Elector:
            e = self.person(ac_code, part_no, gender, age, surname, house, relation, relative, used)
            used.add(e.first_latin)
            return e

        head_gender = "M" if rng.chance(0.85) else "F"
        head_age = self.adult_age(minimum=min_head_age)
        if head_gender == "M":
            head = add("M", head_age, "F", self.outside_relative(surname))
        else:
            head = add("F", head_age, "H", self.outside_relative(surname))
        members = [head]
        head_name = (head.name_latin, head.name_local)
        if size >= 2 and head_gender == "M":
            members.append(add("F", max(18, head_age - rng.between(0, 6)), "H", head_name))
        elder_added = False
        while len(members) < size:
            if head_age < 62 and not elder_added and rng.chance(0.25):
                elder_added = True
                elder_age = head_age + rng.between(22, 32)
                if elder_age <= 100:
                    gender = "F" if rng.chance(0.7) else "M"
                    relation = "H" if gender == "F" else "F"
                    members.append(add(gender, elder_age, relation, self.outside_relative(surname)))
                continue
            child_age = head_age - rng.between(20, 35)
            if child_age < 18:
                break
            gender = "T" if rng.chance(0.002) else ("M" if rng.chance(0.5) else "F")
            members.append(add(gender, child_age, "F" if head_gender == "M" else "M", head_name))
        return members


def assign_serials(electors: list[Elector]) -> None:
    """Gives serial numbers to electors that have none, continuing after each part's highest."""
    highest: dict[tuple[str, int], int] = defaultdict(int)
    for e in electors:
        highest[(e.ac_code, e.part_no)] = max(highest[(e.ac_code, e.part_no)], e.serial_no)
    for e in electors:
        if e.serial_no == 0:
            highest[(e.ac_code, e.part_no)] += 1
            e.serial_no = highest[(e.ac_code, e.part_no)]


def build_baseline(
    rng: Rng, pop: Population, geo: Geography, electors_min: int, electors_max: int
) -> list[Elector]:
    """The v1 roll: households per part up to a target size, never above the 1,200 cap."""
    electors: list[Elector] = []
    for ac in geo.acs:
        for part_no in geo.parts_of(ac.code):
            target = rng.between(electors_min, min(electors_max, POLLING_STATION_CAP))
            count = 0
            while count < target:
                for e in pop.household(ac.code, part_no, max_size=target - count):
                    electors.append(e)
                    count += 1
    assign_serials(electors)
    return electors
