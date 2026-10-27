// Numbers use Indian digit grouping (12,34,567) in every language; dates are shown in IST.

const numberFormats = new Map<string, Intl.NumberFormat>();

function numberFormat(locale: string, options: Intl.NumberFormatOptions = {}): Intl.NumberFormat {
  const key = `${locale}|${JSON.stringify(options)}`;
  let format = numberFormats.get(key);
  if (!format) {
    format = new Intl.NumberFormat(`${locale}-IN`, options);
    numberFormats.set(key, format);
  }
  return format;
}

export const formatNumber = (locale: string, value: number) => numberFormat(locale).format(value);

export function formatSigned(locale: string, value: number): string {
  return numberFormat(locale, { signDisplay: 'exceptZero' }).format(value);
}

/** A fixed-scale decimal string from the engine ("0.164850") as a percentage. */
export function formatRate(locale: string, decimal: string | number, digits = 1): string {
  const value = typeof decimal === 'number' ? decimal : Number(decimal);
  return numberFormat(locale, {
    style: 'percent',
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);
}

export function formatDecimal(locale: string, decimal: string | number, digits = 2): string {
  const value = typeof decimal === 'number' ? decimal : Number(decimal);
  return numberFormat(locale, { maximumFractionDigits: digits }).format(value);
}

export function formatDate(locale: string, iso: string | null | undefined): string {
  if (!iso) return '';
  return new Intl.DateTimeFormat(`${locale}-IN`, {
    dateStyle: 'medium',
    timeZone: 'Asia/Kolkata',
  }).format(new Date(iso));
}

export function formatDateTime(locale: string, iso: string | null | undefined): string {
  if (!iso) return '';
  return new Intl.DateTimeFormat(`${locale}-IN`, {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Kolkata',
  }).format(new Date(iso));
}

/** First and last characters of a hash, for tables; full hashes are shown where they're compared. */
export const shortHash = (hash: string, size = 10) =>
  hash.length <= size * 2 ? hash : `${hash.slice(0, size)}…${hash.slice(-4)}`;
