import numpy as np
import pytest
from scipy import stats

from electralens_engine.analysis.stats import (
    RateBaseline,
    benjamini_hochberg,
    beta_binomial_upper,
    binomial_upper,
    fisher_two_sided,
    robust_rate_baseline,
    wilson_interval,
)


def test_benjamini_hochberg_matches_hand_calculation_and_scipy() -> None:
    p = [0.001, 0.04, 0.03, 0.5]
    q = benjamini_hochberg(p)
    assert q == pytest.approx([0.004, 0.04 * 4 / 3, 0.04 * 4 / 3, 0.5])
    assert q == pytest.approx(list(stats.false_discovery_control(p, method="bh")))


def test_benjamini_hochberg_random_against_scipy() -> None:
    p = np.random.default_rng(1).uniform(size=200).tolist()
    assert benjamini_hochberg(p) == pytest.approx(list(stats.false_discovery_control(p)))


def test_wilson_interval_reference_values() -> None:
    assert wilson_interval(5, 10) == pytest.approx((0.2366, 0.7634), abs=1e-4)
    assert wilson_interval(0, 10) == pytest.approx((0.0, 0.2775), abs=1e-4)


def test_beta_binomial_reduces_to_binomial_without_overdispersion() -> None:
    exact = binomial_upper(60, 1000, 0.04)
    assert beta_binomial_upper(60, 1000, RateBaseline(0.04, 1e-9, 10)) == exact
    # Tiny but real overdispersion stays close to the binomial, and the tail grows with it.
    small = beta_binomial_upper(60, 1000, RateBaseline(0.04, 1e-5, 10))
    larger = beta_binomial_upper(60, 1000, RateBaseline(0.04, 1e-4, 10))
    assert small == pytest.approx(exact, rel=0.1)
    assert exact < small < larger


def test_overdispersion_makes_the_test_more_cautious() -> None:
    plain = RateBaseline(rate=0.04, rho=1e-9, n_units=10)
    dispersed = RateBaseline(rate=0.04, rho=0.005, n_units=10)
    assert beta_binomial_upper(60, 1000, dispersed) > beta_binomial_upper(60, 1000, plain)


def test_robust_baseline_ignores_an_extreme_part() -> None:
    n = [1000] * 20
    k = [40, 38, 42, 41, 39, 37, 43, 40, 36, 44, 40, 41, 39, 38, 42, 40, 39, 41, 40, 200]
    base = robust_rate_baseline(k, n)
    assert base.rate == pytest.approx(0.04, abs=0.002)
    assert beta_binomial_upper(200, 1000, base) < 1e-10


def test_fisher_detects_a_lopsided_table() -> None:
    assert fisher_two_sided(60, 240, 10, 290) < 1e-8
    assert fisher_two_sided(10, 290, 11, 289) > 0.5
