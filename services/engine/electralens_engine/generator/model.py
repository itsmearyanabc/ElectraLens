"""Core types and a deterministic random source for the synthetic generator."""

import random
from collections.abc import Sequence
from dataclasses import dataclass, field, replace
from typing import TypeVar

T = TypeVar("T")

_KEY_ALPHABET = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ"


class Rng:
    """Seeded randomness built only on `random()`, so output is byte-identical for a seed."""

    def __init__(self, seed: int) -> None:
        self._r = random.Random(seed)  # noqa: S311 - reproducible test data, not security

    def unit(self) -> float:
        return self._r.random()

    def between(self, low: int, high: int) -> int:
        """Uniform integer in [low, high]."""
        return low + int(self._r.random() * (high - low + 1))

    def chance(self, p: float) -> bool:
        return self._r.random() < p

    def choice(self, items: Sequence[T]) -> T:
        return items[int(self._r.random() * len(items))]

    def weighted(self, items: Sequence[T], weights: Sequence[float]) -> T:
        target = self._r.random() * sum(weights)
        running = 0.0
        for item, weight in zip(items, weights, strict=True):
            running += weight
            if target < running:
                return item
        return items[-1]

    def sample(self, items: Sequence[T], k: int) -> list[T]:
        """k distinct items, in a random order (partial Fisher-Yates)."""
        pool = list(items)
        k = min(k, len(pool))
        for i in range(k):
            j = self.between(i, len(pool) - 1)
            pool[i], pool[j] = pool[j], pool[i]
        return pool[:k]

    def key(self, length: int = 16) -> str:
        return "".join(self.choice(_KEY_ALPHABET) for _ in range(length))


@dataclass(frozen=True)
class Area:
    code: str
    level: str  # state | district | ac | part
    parent: str | None
    name: dict[str, str]
    introduced_in: str | None = None  # roll version where a part first appears

    def as_json(self) -> dict:
        out = {"code": self.code, "level": self.level, "parent": self.parent, "name": self.name}
        if self.introduced_in is not None:
            out["introduced_in"] = self.introduced_in
        return out


@dataclass
class Elector:
    record_key: str
    ac_code: str
    part_no: int
    serial_no: int
    name_latin: str
    name_local: str
    relative_name_latin: str | None
    relative_name_local: str | None
    relation_type: str | None
    gender: str
    age: int
    house_no: str | None
    epic_like: str | None
    status: str = "active"
    deletion_reason: str | None = None
    # Generator bookkeeping, never written to the roll.
    first_latin: str = field(default="", compare=False)
    surname_latin: str = field(default="", compare=False)
    family: tuple[str, str] = field(default=("", ""), compare=False)

    def copy(self, **changes: object) -> "Elector":
        return replace(self, **changes)  # type: ignore[arg-type]

    def row(self, qualifying_date: str) -> dict:
        return {
            "record_key": self.record_key,
            "ac_code": self.ac_code,
            "part_no": self.part_no,
            "serial_no": self.serial_no,
            "name_local": self.name_local,
            "name_latin": self.name_latin,
            "relative_name_local": self.relative_name_local,
            "relative_name_latin": self.relative_name_latin,
            "relation_type": self.relation_type,
            "gender": self.gender,
            "age": self.age,
            "house_no": self.house_no,
            "epic_like": self.epic_like,
            "status": self.status,
            "deletion_reason": self.deletion_reason,
            "qualifying_date": qualifying_date,
            "is_synthetic": True,
        }


ROLL_COLUMNS = [
    "record_key", "ac_code", "part_no", "serial_no", "name_local", "name_latin",
    "relative_name_local", "relative_name_latin", "relation_type", "gender", "age",
    "house_no", "epic_like", "status", "deletion_reason", "qualifying_date", "is_synthetic",
]  # fmt: skip

BOOTH_COLUMNS = [
    "station_code", "ac_code", "parts_served", "name.en", "name.hi", "address.en", "address.hi",
    "lat", "lng", "accessibility.ramp", "accessibility.ground_floor",
    "accessibility.drinking_water", "accessibility.toilet", "accessibility.wheelchair",
    "source_url", "is_synthetic",
]  # fmt: skip
