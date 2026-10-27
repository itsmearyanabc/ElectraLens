"""Banned-term guard (FR-EXP-4): no accusatory words and no party names in generated text."""

import json
import re
from functools import cache

from electralens_engine.paths import i18n_dir


@cache
def _patterns() -> dict[str, list[tuple[str, re.Pattern[str]]]]:
    with (i18n_dir() / "banned-terms.json").open(encoding="utf-8") as f:
        terms = json.load(f)
    out: dict[str, list[tuple[str, re.Pattern[str]]]] = {}
    for locale, groups in terms.items():
        if not isinstance(groups, dict):
            continue
        patterns = []
        for word in groups.get("words", []):
            if word.isascii():
                # Prefix match, so inflections are caught too ("fraud" -> "fraudulently").
                rx = re.compile(rf"(?<![A-Za-z]){re.escape(word)}", re.IGNORECASE)
            else:
                rx = re.compile(re.escape(word))
            patterns.append((word, rx))
        for acronym in groups.get("acronyms", []):
            patterns.append(
                (acronym, re.compile(rf"(?<![A-Za-z]){re.escape(acronym)}(?![A-Za-z])"))
            )
        out[locale] = patterns
    return out


def find_banned(text: str) -> list[str]:
    """Every banned term found in the text, checking all languages (text can mix scripts)."""
    return [term for patterns in _patterns().values() for term, rx in patterns if rx.search(text)]
