import pytest

from electralens_engine.canon import (
    canonical_row,
    commitment_from_canonical_lines,
    dataset_commitment,
)
from electralens_engine.errors import CanonError
from electralens_engine.hashing import hash_document
from electralens_engine.merkle import inclusion_proof, leaf_hash, merkle_root, verify_inclusion
from electralens_engine.vectors import BOOTH_ROWS, ROLL_ROWS, SALT

# RFC 6962 reference leaves and roots (as used by Certificate Transparency implementations).
RFC6962_LEAVES = [
    "",
    "00",
    "10",
    "2021",
    "3031",
    "40414243",
    "5051525354555657",
    "606162636465666768696a6b6c6d6e6f",
]
RFC6962_ROOTS = [
    "6e340b9cffb37a989ca544e6bb780a2c78901d3fb33738768511a30617afa01d",
    "fac54203e7cc696cf0dfcb42c92a1d9dbaf70ad9e621f4bd8d98662f00e3c125",
    "aeb6bcfe274b70a14fb067a5e5578264db0fa9b51af5e0ba159158f329e06e77",
    "d37ee418976dd95753c1c73862b9398fa2a2cf9b4ff0fdfe8b30cd95209614b7",
    "4e3bbb1f7b478dcfe71fb631631519a3bca12c9aefca1612bfce4c13a86264d4",
    "76e67dadbcdf1e10e1b74ddc608abd2f98dfb16fbce75277b5232a127f2087ef",
    "ddb89be403809e325750d3d263cd78929c2942b7942a34b77e122c9594a74c8c",
    "5dc9da79a70659a9ad559cb701ded9a2ab9d823aad2f4960cfe370eff4604328",
]
LEAVES = [leaf_hash(b"", bytes.fromhex(h)) for h in RFC6962_LEAVES]


def test_empty_tree_root() -> None:
    assert merkle_root([]).hex() == (
        "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
    )


@pytest.mark.parametrize(("size", "root"), list(enumerate(RFC6962_ROOTS, start=1)))
def test_rfc6962_reference_roots(size: int, root: str) -> None:
    assert merkle_root(LEAVES[:size]).hex() == root


def test_inclusion_proofs_verify_and_reject_other_leaves() -> None:
    other = leaf_hash(b"", b"\xff")
    for size in range(1, len(LEAVES) + 1):
        subset = LEAVES[:size]
        root = merkle_root(subset)
        for i in range(size):
            proof = inclusion_proof(i, subset)
            assert verify_inclusion(subset[i], i, size, proof, root)
            assert not verify_inclusion(other, i, size, proof, root)


def test_row_has_sorted_keys_and_every_field() -> None:
    row = {k: v for k, v in ROLL_ROWS[0].items() if k != "house_no"}
    text = canonical_row(row, "electoral_roll_v1").decode()
    assert text.startswith('{"ac_code":"DEMO-ST01-AC001","age":42,')
    assert '"house_no":null' in text


def test_nukta_letter_stays_decomposed_under_nfc() -> None:
    text = canonical_row(ROLL_ROWS[1], "electoral_roll_v1").decode()
    assert "क़" in text
    assert "क़" not in text


def test_booth_normalisation() -> None:
    import json

    first = json.loads(canonical_row(BOOTH_ROWS[0], "polling_stations_v1"))
    second = json.loads(canonical_row(BOOTH_ROWS[1], "polling_stations_v1"))
    assert first["parts_served"] == [1, 2]
    assert first["source_url"] is None
    assert second["lat"] == "0.500000"
    assert second["lng"] == "0.000000"
    assert second["name"] == {"en": "DEMO Community Hall"}


def test_commitment_is_order_independent_and_sensitive_to_one_character() -> None:
    a = dataset_commitment(ROLL_ROWS, "electoral_roll_v1", SALT)
    b = dataset_commitment(list(reversed(ROLL_ROWS)), "electoral_roll_v1", SALT)
    edited = [ROLL_ROWS[0], {**ROLL_ROWS[1], "name_latin": "Mohammad Iqbal"}, ROLL_ROWS[2]]
    c = dataset_commitment(edited, "electoral_roll_v1", SALT)
    assert a.root == b.root
    assert a.root != c.root


def test_failing_row_index_is_reported_without_the_value() -> None:
    with pytest.raises(CanonError) as info:
        dataset_commitment([ROLL_ROWS[0], {**ROLL_ROWS[1], "age": "x"}], "electoral_roll_v1", SALT)
    assert (info.value.row, info.value.field, info.value.code) == (1, "age", "invalid_integer")
    assert "x" not in str(info.value).replace("(row", "")


def test_salt_must_be_32_bytes() -> None:
    with pytest.raises(CanonError, match="bad_salt"):
        dataset_commitment(ROLL_ROWS, "electoral_roll_v1", b"short")


def test_canonical_lines_round_trip_and_reject_tampering() -> None:
    c = dataset_commitment(ROLL_ROWS, "electoral_roll_v1", SALT)
    lines = [row.decode() for row in c.canonical_rows]
    assert commitment_from_canonical_lines(lines, "electoral_roll_v1", SALT).root == c.root
    edited = [line.replace('"age":42', '"age":043') for line in lines]
    assert edited != lines
    with pytest.raises(CanonError, match="not_canonical"):
        commitment_from_canonical_lines(edited, "electoral_roll_v1", SALT)
    with pytest.raises(CanonError, match="not_sorted"):
        commitment_from_canonical_lines(list(reversed(lines)), "electoral_roll_v1", SALT)


def test_documents_ignore_key_order_and_refuse_floats() -> None:
    assert hash_document({"b": 1, "a": [True, None]}) == hash_document({"a": [True, None], "b": 1})
    with pytest.raises(CanonError, match="float_not_allowed"):
        hash_document({"rate": 0.18})
