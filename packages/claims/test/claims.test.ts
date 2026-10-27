import { describe, expect, it } from 'vitest';

import { evaluate, judge, tolerance, type Claim } from '../src/index.ts';

const claim = (overrides: Partial<Claim> = {}): Claim => ({
  areaCode: 'DEMO-HR-AC901',
  metric: 'deletions',
  comparator: 'about',
  value: 1769,
  claimType: 'quantity',
  ...overrides,
});
const publication = { id: 'p', series: 'DEMO-HR', sequence: 1 };

describe('claim rules', () => {
  it('tolerance is max(1 %, 10)', () => {
    expect(tolerance(5)).toBe(10);
    expect(tolerance(3000)).toBe(30);
  });

  it('judges each comparator', () => {
    expect(judge({ comparator: 'about', value: 2010 }, 2000)).toBe('consistent');
    expect(judge({ comparator: 'about', value: 2100 }, 2000)).toBe('contradicted');
    expect(judge({ comparator: 'more_than', value: 3538 }, 1769)).toBe('contradicted');
    expect(judge({ comparator: 'less_than', value: 2000 }, 1769)).toBe('consistent');
  });

  it('never establishes cause or intent (AC-12)', () => {
    const result = evaluate(claim({ claimType: 'cause_or_intent' }), {
      publication,
      areaFound: true,
      cell: { value: 1 },
    });
    expect(result).toMatchObject({ verdict: 'cannot_establish', reason: 'cause_or_intent' });
  });

  it.each([
    [{ publication: null, areaFound: true, cell: { value: 1 } }, 'no_publication'],
    [{ publication, areaFound: false, cell: null }, 'no_area'],
    [{ publication, areaFound: true, cell: null }, 'no_figure'],
    [{ publication, areaFound: true, cell: { value: null } }, 'suppressed'],
  ] as const)('cannot establish without a usable figure (%#)', (figure, reason) => {
    expect(evaluate(claim(), figure)).toMatchObject({ verdict: 'cannot_establish', reason });
  });

  it('checks a covered figure and reports it', () => {
    expect(
      evaluate(claim(), { publication, areaFound: true, cell: { value: 1769 } }),
    ).toMatchObject({
      verdict: 'consistent',
      published: 1769,
      tolerance: 18,
      publicationId: 'p',
    });
  });
});
