// B05.05: the TypeScript renderer must produce exactly what the Python engine produces.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { CATALOGUES, render, type Params } from '../src/index.ts';

interface Case {
  locale: string;
  template: string;
  params: Params;
  expected: string;
}

const file = join(import.meta.dirname, '..', '..', '..', 'test-vectors', 'i18n', 'render.json');
const { cases } = JSON.parse(readFileSync(file, 'utf8')) as { cases: Case[] };

describe('shared rendering vectors', () => {
  it('found the cases', () => {
    expect(cases.length).toBeGreaterThan(20);
  });

  it.each(cases.map((c, i) => [i, c.locale, c.template.slice(0, 40), c] as const))(
    'case %i (%s): %s',
    (_i, locale, _t, testCase) => {
      const catalogue = CATALOGUES[locale];
      if (!catalogue) throw new Error(`no catalogue for ${locale}`);
      expect(render(testCase.template, testCase.params, locale, catalogue)).toBe(testCase.expected);
    },
  );
});

describe('catalogues', () => {
  it('every locale has the same keys as English', () => {
    const english = Object.keys(CATALOGUES.en ?? {}).sort();
    for (const [locale, catalogue] of Object.entries(CATALOGUES)) {
      expect(Object.keys(catalogue).sort(), locale).toEqual(english);
    }
  });
});
