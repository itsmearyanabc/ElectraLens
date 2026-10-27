"""Statistics for the rate rules (B04.03).

Rates are compared with the other parts of the same constituency. The baseline rate and the
overdispersion are estimated robustly (interquartile trimming and the median absolute
deviation), so a few extreme parts can't hide themselves by inflating the baseline.
"""

from collections.abc import Sequence
from dataclasses import dataclass

import numpy as np
from scipy import stats

Z_95 = 1.959963984540054


@dataclass(frozen=True)
class RateBaseline:
    rate: float
    """Robust expected rate p0 for the constituency."""
    rho: float
    """Intra-part correlation: 0 means plain binomial variation."""
    n_units: int


def robust_rate_baseline(k: Sequence[int], n: Sequence[int]) -> RateBaseline:
    counts, sizes = np.asarray(k, dtype=float), np.asarray(n, dtype=float)
    keep = sizes > 0
    counts, sizes = counts[keep], sizes[keep]
    if sizes.size == 0:
        raise ValueError("no parts with electors")
    rates = counts / sizes
    q1, q3 = np.quantile(rates, [0.25, 0.75])
    core = (rates >= q1) & (rates <= q3)
    pooled_core = counts[core].sum() / sizes[core].sum()
    floor = 0.5 / sizes.sum()
    p0 = min(max(pooled_core, floor), 1 - floor)
    residuals = (counts - sizes * p0) / np.sqrt(sizes * p0 * (1 - p0))
    mad = np.median(np.abs(residuals - np.median(residuals)))
    dispersion = max((1.4826 * mad) ** 2, 1.0)
    mean_size = sizes.mean()
    rho = max((dispersion - 1) / (mean_size - 1), 1e-9) if mean_size > 1 else 1e-9
    return RateBaseline(rate=float(p0), rho=float(rho), n_units=int(sizes.size))


def beta_binomial_upper(k: int, n: int, baseline: RateBaseline) -> float:
    """P(K >= k) for a part of n electors under the constituency's beta-binomial model."""
    if k <= 0:
        return 1.0
    if baseline.rho <= 1e-6:
        # No measurable overdispersion: the binomial limit is exact, and SciPy's beta-binomial
        # loses precision when its shape parameters are enormous.
        return binomial_upper(k, n, baseline.rate)
    scale = 1 / baseline.rho - 1
    a, b = baseline.rate * scale, (1 - baseline.rate) * scale
    return float(min(1.0, max(0.0, stats.betabinom.sf(k - 1, n, a, b))))


def binomial_upper(k: int, n: int, p: float) -> float:
    """P(K >= k) for K ~ Binomial(n, p)."""
    if k <= 0:
        return 1.0
    return float(min(1.0, max(0.0, stats.binom.sf(k - 1, n, p))))


def fisher_two_sided(a: int, b: int, c: int, d: int) -> float:
    """Fisher's exact test on [[a, b], [c, d]]."""
    return float(stats.fisher_exact([[a, b], [c, d]], alternative="two-sided").pvalue)


def wilson_interval(k: int, n: int, z: float = Z_95) -> tuple[float, float]:
    if n == 0:
        return 0.0, 1.0
    p = k / n
    denom = 1 + z * z / n
    centre = (p + z * z / (2 * n)) / denom
    half = z * np.sqrt(p * (1 - p) / n + z * z / (4 * n * n)) / denom
    return float(max(0.0, centre - half)), float(min(1.0, centre + half))


def benjamini_hochberg(p_values: Sequence[float]) -> list[float]:
    """Benjamini-Hochberg adjusted q-values, in the input order."""
    p = np.asarray(p_values, dtype=float)
    m = p.size
    if m == 0:
        return []
    order = np.argsort(p, kind="stable")
    ranked = p[order] * m / np.arange(1, m + 1)
    adjusted = np.minimum.accumulate(ranked[::-1])[::-1]
    q = np.empty(m)
    q[order] = np.minimum(adjusted, 1.0)
    return [float(v) for v in q]
