/** A redirect target from a query string: same-site paths only, never another origin. */
export function safeNext(value: string | null | undefined, fallback: string): string {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.includes('\\'))
    return fallback;
  return value;
}
