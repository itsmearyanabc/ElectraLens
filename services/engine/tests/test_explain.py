import re

import pytest

from electralens_engine.analysis.findings import ALTERNATIVES, LIMITATIONS
from electralens_engine.explain.banned import find_banned
from electralens_engine.explain.render import catalogue, group_indian, locales, render

EXPLANATION_PREFIXES = ("rule.", "signal.", "footer", "alt.", "lim.", "reason.", "area.")


def test_two_languages_at_least_and_identical_keys() -> None:
    assert {"en", "hi"} <= set(locales())
    english = set(catalogue("en"))
    for loc in locales():
        assert set(catalogue(loc)) == english, loc


@pytest.mark.parametrize("rule", [f"R{i:02d}" for i in range(1, 13)])
def test_every_rule_is_explained_in_every_language(rule: str) -> None:
    for loc in locales():
        cat = catalogue(loc)
        assert cat[f"rule.{rule}.name"]
        assert any(k.startswith(f"rule.{rule}.template") for k in cat), (rule, loc)
        assert len(ALTERNATIVES[rule]) >= 2  # AC-9
        for key in [*ALTERNATIVES[rule], *LIMITATIONS[rule], "lim.synthetic_data"]:
            assert cat[key], (key, loc)


def test_templates_use_the_same_placeholders_in_every_language() -> None:
    placeholder = re.compile(r"\{[^}]+\}")
    english = catalogue("en")
    for loc in locales():
        for key, text in catalogue(loc).items():
            assert sorted(placeholder.findall(text)) == sorted(placeholder.findall(english[key])), (
                loc,
                key,
            )


def test_no_banned_terms_in_any_explanation_text() -> None:  # AC-10
    for loc in locales():
        for key, text in catalogue(loc).items():
            if key.startswith(EXPLANATION_PREFIXES):
                assert find_banned(text) == [], (loc, key)


@pytest.mark.parametrize(
    "text",
    [
        "This is fraud",
        "Fraudulently removed",
        "RIGGED roll",
        "fake voters found",
        "the BJP said",
        "भाजपा",
        "यह धांधली है",
        "Congress",
    ],
)
def test_banned_terms_are_caught(text: str) -> None:
    assert find_banned(text)


@pytest.mark.parametrize(
    "text", ["absent electors", "shifted", "Spending", "DEMO-HR-AC901", "spare"]
)
def test_ordinary_words_pass(text: str) -> None:
    assert find_banned(text) == []


def test_indian_digit_grouping_and_formats() -> None:
    assert group_indian(12345678) == "1,23,45,678"
    assert render(
        "{r:pct} {x:dec1} {n:int}", {"r": "0.170898", "x": "4.747166", "n": 1024}, "en"
    ) == ("17.1% 4.7 1,024")
    assert render("{reason:reason}", {"reason": "D"}, "hi") == "मृत्यु"
