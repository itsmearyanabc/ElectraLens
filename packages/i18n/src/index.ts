import en from '../catalogue/en.json' with { type: 'json' };
import hi from '../catalogue/hi.json' with { type: 'json' };

import type { Catalogue } from './render.ts';

export * from './banned.ts';
export * from './render.ts';

/** Catalogues by locale. The third language is added here once chosen (decision D4). */
export const CATALOGUES: Readonly<Record<string, Catalogue>> = { en, hi };
export const LOCALES = Object.keys(CATALOGUES);
