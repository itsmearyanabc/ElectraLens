"""Phonetic keys for Latin transliterations of Indian names (`phonetic_key_v1`).

Spelling variants of one name share a key (Mohammad / Muhammad / Mohd, Lakshmi / Laxmi,
Chaudhary / Chowdhury, Rajendra / Rajinder), while different names keep different keys
(Rajesh / Ramesh, Kavita / Savita). Jaro-Winkler can't separate those two groups: variant
pairs score 0.80-0.88 and different-name pairs 0.82-0.91, so likely duplicates (rule R02)
match on these keys instead.
"""

import re

_ALIASES = {"mohd": "mohammad", "md": "mohammad"}
_REPLACEMENTS = [("ph", "f"), ("x", "ks"), ("q", "k"), ("z", "j"), ("ck", "k")]
_ASPIRATES = re.compile(r"([bcdgkpst])h")
_DOUBLES = re.compile(r"(.)\1+")
_SOFT = re.compile(r"[aeiouyhw]")
_NON_LETTERS = re.compile(r"[^a-z]")


def token_key(token: str) -> str:
    t = _NON_LETTERS.sub("", token.lower())
    t = _ALIASES.get(t, t)
    for old, new in _REPLACEMENTS:
        t = t.replace(old, new)
    t = _DOUBLES.sub(r"\1", _ASPIRATES.sub(r"\1", t))
    return t[:1] + _SOFT.sub("", t[1:])


def name_key(name: str) -> str:
    """Key of a full name: the key of every token, in order."""
    return " ".join(token_key(token) for token in name.split())
