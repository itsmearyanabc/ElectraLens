import { describe, expect, it } from 'vitest';

import { aadhaarShapeOk, isCategory } from '../lib/complaints';

describe('aadhaarShapeOk', () => {
  it('accepts a 12-digit number with a valid Verhoeff check digit', () => {
    // The commonly published UIDAI specimen number, not a real person's.
    expect(aadhaarShapeOk('234123412346')).toBe(true);
  });

  it('rejects a wrong check digit, wrong length or a leading 0 or 1', () => {
    expect(aadhaarShapeOk('234123412347')).toBe(false);
    expect(aadhaarShapeOk('23412341234')).toBe(false);
    expect(aadhaarShapeOk('134123412346')).toBe(false);
  });
});

describe('isCategory', () => {
  it('knows the database categories only', () => {
    expect(isCategory('wrongful_deletion')).toBe(true);
    expect(isCategory('fraud')).toBe(false);
  });
});
