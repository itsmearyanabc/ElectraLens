import pytest

from electralens_engine.generator.names import LATIN_VARIANTS
from electralens_engine.namekey import name_key, token_key


@pytest.mark.parametrize(
    ("name", "variant"), [(a, v) for a, vs in LATIN_VARIANTS.items() for v in vs]
)
def test_spelling_variants_share_a_key(name: str, variant: str) -> None:
    assert token_key(name) == token_key(variant)


@pytest.mark.parametrize(
    ("a", "b"),
    [
        ("Rajesh", "Ramesh"),
        ("Kavita", "Savita"),
        ("Sarita", "Sita"),
        ("Sandhu", "Sinha"),
        ("Singh", "Saini"),
    ],
)
def test_different_names_keep_different_keys(a: str, b: str) -> None:
    assert token_key(a) != token_key(b)


def test_full_name_key_keeps_token_order() -> None:
    assert name_key("Mohd Iqbal") == name_key("Muhammad Ikbal")
    assert name_key("Ram Kumar") != name_key("Kumar Ram")
