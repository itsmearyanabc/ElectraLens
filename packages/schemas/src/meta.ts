import type { z } from 'zod';

/**
 * How a field is normalised before hashing (canonicalisation `elcanon-1`).
 * The Python and TypeScript canonicalisers both read this from the JSON Schema,
 * so the schema — not each implementation — decides how a value is normalised.
 */
export type CanonKind =
  | 'text' // NFC, trim, collapse whitespace
  | 'code' // ASCII identifier, trimmed and upper-cased
  | 'enum' // trimmed, must be one of the schema's values
  | 'integer'
  | 'boolean'
  | 'date' // YYYY-MM-DD
  | 'decimal' // fixed-scale decimal string, never a float
  | 'int_list' // sorted ascending, no duplicates
  | 'locale_text' // { locale: text }
  | 'flags'; // { name: boolean }

/** Privacy class of a field (FR-ING-5). Direct identifiers never leave the restricted tier. */
export type Classification = 'direct' | 'quasi' | 'none';

export interface CanonSpec {
  kind: CanonKind;
  nullable: boolean;
  scale?: number;
}

/** Attaches canonicalisation and privacy metadata to a field schema. */
export function field<T extends z.ZodType>(
  schema: T,
  spec: { kind: CanonKind; nullable?: boolean; scale?: number },
  classification: Classification,
): T {
  const canon: CanonSpec = { kind: spec.kind, nullable: spec.nullable ?? false };
  if (spec.scale !== undefined) canon.scale = spec.scale;
  return schema.meta({ 'x-canon': canon, 'x-classification': classification });
}
