// Query-string helpers. Values are only ever compared against fixed lists or patterns before use.

export type SearchParams = Record<string, string | string[] | undefined>;

export function one(params: SearchParams, key: string): string | undefined {
  const value = params[key];
  const first = Array.isArray(value) ? value[0] : value;
  return first && first.length <= 100 ? first : undefined;
}

export function oneOf<T extends string>(
  params: SearchParams,
  key: string,
  allowed: readonly T[],
): T | undefined {
  const value = one(params, key);
  return value && (allowed as readonly string[]).includes(value) ? (value as T) : undefined;
}

export function pageNumber(params: SearchParams): number {
  const value = Number(one(params, 'page') ?? '1');
  return Number.isInteger(value) && value >= 1 && value <= 10_000 ? value : 1;
}
