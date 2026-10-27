import { describe, expect, it } from 'vitest';

import { findBannedTerm } from '../src/banned.ts';

describe('findBannedTerm', () => {
  it('passes neutral statistical language', () => {
    expect(
      findBannedTerm('Deletions in this part were higher than in similar parts of the same area.'),
    ).toBeNull();
  });

  it('finds English words case-insensitively on word boundaries', () => {
    expect(findBannedTerm('This looks like FRAUD to some.')).toBe('FRAUD');
    expect(findBannedTerm('The roll was rigged.')).toBe('rigged');
    expect(findBannedTerm('defraud')).toBeNull();
  });

  it('finds Hindi terms as substrings', () => {
    expect(findBannedTerm('यह धोखाधड़ी है')).not.toBeNull();
  });
});
