import type { Database, Json } from '../database.types';

export type { Json };
export type Tables = Database['public']['Tables'];
export type Row<T extends keyof Tables> = Tables[T]['Row'];
export type Enums = Database['public']['Enums'];

/** Names stored as `{ "en": "...", "hi": "..." }`. */
export type LocalisedName = Partial<Record<string, string>>;

export function localName(name: Json | null | undefined, locale: string): string {
  if (!name || typeof name !== 'object' || Array.isArray(name)) return '';
  const names = name as LocalisedName;
  return names[locale] ?? names.en ?? '';
}

/** Thrown when Supabase can't answer; the error page shows a "data unavailable" message. */
export class DataUnavailable extends Error {
  constructor(what: string, cause: unknown) {
    super(`could not load ${what}`, { cause });
    this.name = 'DataUnavailable';
  }
}
