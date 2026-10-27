"""Template rendering, mirrored by packages/i18n/src/render.ts (shared vectors keep them equal).

Placeholders are `{name}` or `{name:format}`:
  int   integer with Indian digit grouping (1,23,456)
  pct   fixed-scale decimal string as a percentage with one decimal (0.179700 -> 18.0%)
  dec1  fixed-scale decimal string with one decimal (2.950000 -> 3.0)
  any other format name is a label namespace: {reason:reason} looks up "reason.<value>".
A value may be an object keyed by locale; the current locale's text is used.
Numbers are formatted with integer arithmetic so both languages round identically.
"""

import json
import re
from functools import cache
from typing import Any

from electralens_engine.paths import i18n_dir

PLACEHOLDER = re.compile(r"\{([a-z_][a-z0-9_]*)(?::([a-z_][a-z0-9_]*))?\}")
_DECIMAL = re.compile(r"(-?)([0-9]+)(?:\.([0-9]+))?")


@cache
def catalogue(locale: str) -> dict[str, str]:
    with (i18n_dir() / "catalogue" / f"{locale}.json").open(encoding="utf-8") as f:
        return json.load(f)


def locales() -> list[str]:
    return sorted(p.stem for p in (i18n_dir() / "catalogue").glob("*.json"))


def _micro(value: Any) -> int:
    """Value in millionths, from an int or a decimal string with up to six decimals."""
    if isinstance(value, bool):
        raise TypeError("boolean is not a number")
    if isinstance(value, int):
        return value * 1_000_000
    m = _DECIMAL.fullmatch(str(value))
    if not m or len(m.group(3) or "") > 6:
        raise ValueError(f"not a decimal: {value!r}")
    magnitude = int(m.group(2)) * 1_000_000 + int((m.group(3) or "").ljust(6, "0"))
    return -magnitude if m.group(1) == "-" else magnitude


def _round_div(value: int, divisor: int) -> int:
    """Division rounding half away from zero."""
    q, r = divmod(abs(value), divisor)
    q += 2 * r >= divisor
    return -q if value < 0 else q


def group_indian(n: int) -> str:
    sign, digits = ("-" if n < 0 else ""), str(abs(n))
    if len(digits) <= 3:
        return sign + digits
    head, tail = digits[:-3], digits[-3:]
    pairs = []
    while len(head) > 2:
        pairs.insert(0, head[-2:])
        head = head[:-2]
    return sign + ",".join([head, *pairs, tail])


def _one_decimal(tenths: int) -> str:
    sign = "-" if tenths < 0 else ""
    return f"{sign}{abs(tenths) // 10}.{abs(tenths) % 10}"


def format_value(value: Any, fmt: str | None, locale: str) -> str:
    if isinstance(value, dict):
        value = value.get(locale, value["en"])
    if fmt is None:
        return str(value)
    if fmt == "int":
        return group_indian(int(value))
    if fmt == "pct":
        return _one_decimal(_round_div(_micro(value), 1_000)) + "%"
    if fmt == "dec1":
        return _one_decimal(_round_div(_micro(value), 100_000))
    return catalogue(locale)[f"{fmt}.{value}"]


def render(template: str, params: dict[str, Any], locale: str) -> str:
    return PLACEHOLDER.sub(lambda m: format_value(params[m.group(1)], m.group(2), locale), template)


def render_key(key: str, params: dict[str, Any], locale: str) -> str:
    return render(catalogue(locale)[key], params, locale)


def render_vectors() -> dict[str, Any]:
    """Shared rendering cases (test-vectors/i18n/render.json) for the TypeScript renderer."""
    cases = [
        ("{n:int}", {"n": 0}),
        ("{n:int}", {"n": 999}),
        ("{n:int}", {"n": 1000}),
        ("{n:int}", {"n": 123456}),
        ("{n:int}", {"n": 12345678}),
        ("{n:int}", {"n": -1234567}),
        ("{r:pct}", {"r": "0.179700"}),
        ("{r:pct}", {"r": "0.000500"}),
        ("{r:pct}", {"r": "0.000499"}),
        ("{r:pct}", {"r": "1.000000"}),
        ("{r:pct}", {"r": "-0.012345"}),
        ("{x:dec1}", {"x": "2.950000"}),
        ("{x:dec1}", {"x": "2.949999"}),
        ("{x:dec1}", {"x": "12.000000"}),
        ("{x:dec1}", {"x": 3}),
        ("{q}", {"q": "4.00e-04"}),
        ("{reason:reason}", {"reason": "D"}),
        (
            "{area} ({n:int})",
            {"area": {"en": "Part 7, Gurugram DEMO-1", "hi": "गुरुग्राम डेमो-1, भाग 7"}, "n": 5},
        ),
    ]
    out = []
    for loc in locales():
        for template, params in cases:
            out.append(
                {
                    "locale": loc,
                    "template": template,
                    "params": params,
                    "expected": render(template, params, loc),
                }
            )
        sample = {
            "area": {"en": "Part 7, Gurugram DEMO-1", "hi": "गुरुग्राम डेमो-1, भाग 7"},
            "deletions": 175,
            "electors_baseline": 1024,
            "rate": "0.170898",
            "expected_rate": "0.036000",
            "rate_ratio": "4.747166",
            "q_value": "1.20e-30",
        }
        out.append(
            {
                "locale": loc,
                "template": catalogue(loc)["rule.R05.template"],
                "params": sample,
                "expected": render_key("rule.R05.template", sample, loc),
            }
        )
    return {"kind": "render", "name": "render", "cases": out}
