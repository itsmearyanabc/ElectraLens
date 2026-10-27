// Template rendering, mirrored by services/engine/electralens_engine/explain/render.py.
// Placeholders: {name} or {name:format}; formats int, pct, dec1, or a label namespace
// ({reason:reason} looks up "reason.<value>"). Numbers use integer arithmetic so rounding
// matches Python exactly.

export type Catalogue = Readonly<Record<string, string>>;
export type ParamValue = string | number | Readonly<Record<string, string>>;
export type Params = Readonly<Record<string, ParamValue>>;

const PLACEHOLDER = /\{([a-z_][a-z0-9_]*)(?::([a-z_][a-z0-9_]*))?\}/g;
const DECIMAL = /^(-?)([0-9]+)(?:\.([0-9]+))?$/;

/** Value in millionths, from an integer or a decimal string with up to six decimals. */
function micro(value: string | number): bigint {
  if (typeof value === 'number') {
    if (!Number.isSafeInteger(value)) throw new TypeError(`not an integer: ${value}`);
    return BigInt(value) * 1_000_000n;
  }
  const m = DECIMAL.exec(value);
  if (!m || (m[3] ?? '').length > 6) throw new TypeError(`not a decimal: ${value}`);
  const magnitude = BigInt(m[2] ?? '0') * 1_000_000n + BigInt((m[3] ?? '').padEnd(6, '0'));
  return m[1] === '-' ? -magnitude : magnitude;
}

/** Division rounding half away from zero. */
function roundDiv(value: bigint, divisor: bigint): bigint {
  const negative = value < 0n;
  const abs = negative ? -value : value;
  let q = abs / divisor;
  if (2n * (abs % divisor) >= divisor) q += 1n;
  return negative ? -q : q;
}

export function groupIndian(n: number | bigint): string {
  const big = BigInt(n);
  const sign = big < 0n ? '-' : '';
  const digits = (big < 0n ? -big : big).toString();
  if (digits.length <= 3) return sign + digits;
  let head = digits.slice(0, -3);
  const tail = digits.slice(-3);
  const pairs: string[] = [];
  while (head.length > 2) {
    pairs.unshift(head.slice(-2));
    head = head.slice(0, -2);
  }
  return sign + [head, ...pairs, tail].join(',');
}

function oneDecimal(tenths: bigint): string {
  const sign = tenths < 0n ? '-' : '';
  const abs = tenths < 0n ? -tenths : tenths;
  return `${sign}${abs / 10n}.${abs % 10n}`;
}

export function formatValue(
  value: ParamValue,
  format: string | undefined,
  locale: string,
  catalogue: Catalogue,
): string {
  let v: string | number;
  if (typeof value === 'object') {
    const localized = value[locale] ?? value.en;
    if (localized === undefined) throw new Error('localized value has no English text');
    v = localized;
  } else {
    v = value;
  }
  switch (format) {
    case undefined:
      return String(v);
    case 'int':
      return groupIndian(typeof v === 'number' ? v : BigInt(v));
    case 'pct':
      return `${oneDecimal(roundDiv(micro(v), 1_000n))}%`;
    case 'dec1':
      return oneDecimal(roundDiv(micro(v), 100_000n));
    default: {
      const label = catalogue[`${format}.${v}`];
      if (label === undefined) throw new Error(`missing label ${format}.${v}`);
      return label;
    }
  }
}

export function render(
  template: string,
  params: Params,
  locale: string,
  catalogue: Catalogue,
): string {
  return template.replace(PLACEHOLDER, (_match, name: string, format: string | undefined) => {
    const value = params[name];
    if (value === undefined) throw new Error(`missing parameter ${name}`);
    return formatValue(value, format, locale, catalogue);
  });
}
