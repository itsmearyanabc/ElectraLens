import type { CanonSpec } from '@electralens/schemas';

import { CanonError } from './errors.ts';

// An explicit whitespace set, identical in Python, so both sides collapse the same characters.
const WS_CLASS =
  '\\t\\n\\v\\f\\r \\u00A0\\u1680\\u2000-\\u200A\\u2028\\u2029\\u202F\\u205F\\u3000\\uFEFF';
const WS_RUN = new RegExp(`[${WS_CLASS}]+`, 'g');
const WS_EDGES = new RegExp(`^[${WS_CLASS}]+|[${WS_CLASS}]+$`, 'g');
// C0 and C1 control characters that are not in the whitespace set.
// eslint-disable-next-line no-control-regex -- matching control characters is the point
const CONTROL = /[\u0000-\u0008\u000E-\u001F\u007F-\u009F]/;
// Characters outside the Basic Multilingual Plane are rejected: every Indian script is in the
// BMP, and it keeps string-length limits identical in UTF-16 (zod) and code points (Python).
const ASTRAL = /[\u{10000}-\u{10FFFF}]/u;
const INTEGER = /^-?[0-9]+$/;
const DATE = /^([0-9]{4})-([0-9]{2})-([0-9]{2})$/;
const DECIMAL = /^(-?)([0-9]+)(?:\.([0-9]+))?$/;
const LOCALE = /^[a-z]{2,3}$/;

export interface PropertySchema {
  'x-canon': CanonSpec;
  enum?: readonly string[];
  anyOf?: readonly { enum?: readonly string[] }[];
}

export type Json = null | boolean | number | string | Json[] | { [key: string]: Json };

const trimWs = (s: string): string => s.replace(WS_EDGES, '');

function wellFormed(value: string, field: string): string {
  if (!value.isWellFormed()) throw new CanonError('not_well_formed', field);
  return value;
}

/** Empty strings (after trimming) mean "no value" for every kind. */
function blank(raw: unknown): boolean {
  return raw === null || raw === undefined || (typeof raw === 'string' && trimWs(raw) === '');
}

function text(raw: unknown, field: string): string {
  if (typeof raw !== 'string') throw new CanonError('type', field);
  const value = trimWs(wellFormed(raw, field).normalize('NFC').replace(WS_RUN, ' '));
  if (CONTROL.test(value)) throw new CanonError('control_char', field);
  if (ASTRAL.test(value)) throw new CanonError('unsupported_char', field);
  return value;
}

function code(raw: unknown, field: string): string {
  if (typeof raw !== 'string') throw new CanonError('type', field);
  // ASCII-only upper-casing: identical in every language and locale.
  return trimWs(wellFormed(raw, field)).replace(/[a-z]/g, (c) => c.toUpperCase());
}

function enumValue(raw: unknown, field: string, allowed: readonly string[]): string {
  if (typeof raw !== 'string') throw new CanonError('type', field);
  const value = trimWs(wellFormed(raw, field));
  if (!allowed.includes(value)) throw new CanonError('invalid_enum', field);
  return value;
}

function integer(raw: unknown, field: string): number {
  let value: number;
  if (typeof raw === 'number') {
    if (!Number.isSafeInteger(raw)) throw new CanonError('invalid_integer', field);
    value = raw;
  } else if (typeof raw === 'string') {
    const s = trimWs(raw);
    if (!INTEGER.test(s)) throw new CanonError('invalid_integer', field);
    const big = BigInt(s);
    if (big > BigInt(Number.MAX_SAFE_INTEGER) || big < BigInt(Number.MIN_SAFE_INTEGER)) {
      throw new CanonError('invalid_integer', field);
    }
    value = Number(big);
  } else {
    throw new CanonError('type', field);
  }
  return value === 0 ? 0 : value; // no negative zero
}

function boolean(raw: unknown, field: string): boolean {
  if (typeof raw === 'boolean') return raw;
  if (typeof raw === 'string') {
    const s = trimWs(raw).toLowerCase();
    if (s === 'true') return true;
    if (s === 'false') return false;
  }
  throw new CanonError('type', field);
}

function date(raw: unknown, field: string): string {
  if (typeof raw !== 'string') throw new CanonError('type', field);
  const s = trimWs(raw);
  const m = DATE.exec(s);
  if (!m) throw new CanonError('invalid_date', field);
  const [year, month, day] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const leap = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
  const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  if (year < 1000 || month < 1 || month > 12 || day < 1 || day > (days[month - 1] ?? 0)) {
    throw new CanonError('invalid_date', field);
  }
  return s;
}

function decimal(raw: unknown, field: string, scale: number): string {
  let s: string;
  if (typeof raw === 'number') {
    // Floats are formatted at the target scale and must survive the round trip exactly,
    // so excess precision is rejected rather than silently rounded (same rule in Python).
    if (!Number.isFinite(raw) || Math.abs(raw) >= 1e15) throw new CanonError('type', field);
    s = raw.toFixed(scale);
    if (Number(s) !== raw) throw new CanonError('decimal_scale', field);
  } else if (typeof raw === 'string') {
    s = trimWs(raw);
  } else {
    throw new CanonError('type', field);
  }
  const m = DECIMAL.exec(s);
  if (!m) throw new CanonError('type', field);
  const intPart = (m[2] ?? '0').replace(/^0+(?=[0-9])/, '');
  const frac = m[3] ?? '';
  if (frac.length > scale) throw new CanonError('decimal_scale', field);
  const digits = `${intPart}.${frac.padEnd(scale, '0')}`;
  const isZero = /^[0.]+$/.test(digits);
  return m[1] === '-' && !isZero ? `-${digits}` : digits;
}

function intList(raw: unknown, field: string): number[] {
  let items: readonly unknown[];
  if (typeof raw === 'string')
    items = trimWs(raw).split(';'); // CSV form: "3;1;2"
  else if (Array.isArray(raw)) items = raw;
  else throw new CanonError('type', field);
  const values = items.map((item) => integer(item, field)).sort((a, b) => a - b);
  for (let i = 1; i < values.length; i += 1) {
    if (values[i] === values[i - 1]) throw new CanonError('duplicate_item', field);
  }
  return values;
}

function localeText(raw: unknown, field: string): Record<string, string> {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    throw new CanonError('type', field);
  }
  const out: Record<string, string> = {};
  for (const [locale, value] of Object.entries(raw)) {
    if (!LOCALE.test(locale)) throw new CanonError('invalid_locale', field);
    const normalized = blank(value) ? '' : text(value, field);
    if (normalized === '') throw new CanonError('required', `${field}.${locale}`);
    out[locale] = normalized;
  }
  return out;
}

function flags(raw: unknown, field: string): Record<string, boolean> {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    throw new CanonError('type', field);
  }
  const out: Record<string, boolean> = {};
  for (const [key, value] of Object.entries(raw)) out[key] = boolean(value, `${field}.${key}`);
  return out;
}

function enumValuesOf(property: PropertySchema): readonly string[] {
  return property.enum ?? property.anyOf?.find((s) => s.enum)?.enum ?? [];
}

/** Normalises one field value according to its `x-canon` spec. */
export function normalizeValue(raw: unknown, property: PropertySchema, field: string): Json {
  const spec = property['x-canon'];
  if (blank(raw)) {
    if (!spec.nullable) throw new CanonError('required', field);
    return null;
  }
  switch (spec.kind) {
    case 'text': {
      const value = text(raw, field);
      if (value === '') throw new CanonError('required', field);
      return value;
    }
    case 'code':
      return code(raw, field);
    case 'enum':
      return enumValue(raw, field, enumValuesOf(property));
    case 'integer':
      return integer(raw, field);
    case 'boolean':
      return boolean(raw, field);
    case 'date':
      return date(raw, field);
    case 'decimal':
      return decimal(raw, field, spec.scale ?? 6);
    case 'int_list':
      return intList(raw, field);
    case 'locale_text':
      return localeText(raw, field);
    case 'flags':
      return flags(raw, field);
  }
}

/**
 * Normalises a raw row (from CSV strings or typed values) into its canonical object.
 * Every schema property is present in the output; missing optional values become null.
 */
export function normalizeRow(
  raw: Readonly<Record<string, unknown>>,
  properties: Readonly<Record<string, PropertySchema>>,
): Record<string, Json> {
  for (const key of Object.keys(raw)) {
    if (!Object.hasOwn(properties, key)) throw new CanonError('unknown_field', key);
  }
  const out: Record<string, Json> = {};
  for (const [name, property] of Object.entries(properties)) {
    out[name] = normalizeValue(raw[name], property, name);
  }
  return out;
}
