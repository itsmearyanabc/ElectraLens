import { describe, expect, it } from 'vitest';

import { changeRate, rateLevels } from '../lib/levels';

describe('rateLevels', () => {
  it('calls rates close to the neighbours normal', () => {
    const levels = rateLevels([0.04, 0.042, 0.039, 0.041, 0.043]);
    expect(levels.every((level) => level?.level === 'normal')).toBe(true);
  });

  it('marks a far outlier highly unusual, with its direction', () => {
    const levels = rateLevels([0.04, 0.042, 0.039, 0.041, 0.043, 0.165]);
    expect(levels[5]).toMatchObject({ level: 'highly_unusual', direction: 'higher' });
    expect(levels[0]?.level).toBe('normal');
  });

  it('gives no level with too few comparable areas or for missing rates', () => {
    expect(rateLevels([0.04, 0.2, null])).toEqual([null, null, null]);
    expect(rateLevels([0.04, 0.042, 0.039, 0.041, null])[4]).toBeNull();
  });
});

describe('changeRate', () => {
  it('needs both numbers and an earlier roll', () => {
    expect(changeRate(121, 734)).toBeCloseTo(0.1649, 3);
    expect(changeRate(null, 734)).toBeNull();
    expect(changeRate(5, 0)).toBeNull();
  });
});
