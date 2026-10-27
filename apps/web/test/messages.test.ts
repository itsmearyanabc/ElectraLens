import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

const root = join(import.meta.dirname, '..', 'messages');

function keys(value: unknown, prefix = ''): string[] {
  if (Array.isArray(value)) return [`${prefix}[${value.length}]`];
  if (value && typeof value === 'object') {
    return Object.entries(value).flatMap(([k, v]) => keys(v, prefix ? `${prefix}.${k}` : k));
  }
  return [prefix];
}

const load = (locale: string, file: string) =>
  JSON.parse(readFileSync(join(root, locale, file), 'utf8')) as unknown;

describe('message catalogues', () => {
  const files = readdirSync(join(root, 'en'));

  it.each(files)('%s has exactly the same keys in English and Hindi', (file) => {
    expect(keys(load('hi', file)).sort()).toEqual(keys(load('en', file)).sort());
  });

  it('never asks for a voter ID number in a form field label (B14.02)', () => {
    for (const file of files) {
      for (const locale of ['en', 'hi']) {
        expect(JSON.stringify(load(locale, file))).not.toMatch(/"(epic|voterId|epic_number)"\s*:/i);
      }
    }
  });
});
