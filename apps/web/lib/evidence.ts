import { catalogueText } from './findings';
import { formatDecimal, formatNumber, formatRate } from './format';

const RATE_KEYS = new Set([
  'rate',
  'expected_rate',
  'men_rate',
  'women_rate',
  'reason_share',
  'expected_share',
  'missing_share',
  'threshold_share',
]);
const RATIO_KEYS = new Set(['rate_ratio', 'share_ratio', 'deletion_rate_ratio']);
const RAW_KEYS = new Set(['p_value', 'q_value']);

export interface EvidenceRow {
  key: string;
  value: string;
}

// JSONB reorders object keys, so evidence is put back in reading order: what happened, then how
// it compares, then the test statistics. Unknown keys keep their place at the end.
const ORDER = [
  'electors_baseline',
  'electors_target',
  'deletions',
  'additions',
  'additions_18_19',
  'transfers_in',
  'reason',
  'reason_count',
  'rate',
  'expected_rate',
  'rate_ratio',
  'reason_share',
  'expected_share',
  'share_ratio',
  'p_value',
  'q_value',
  'tests_in_run',
];
const rank = (key: string) => {
  const index = ORDER.indexOf(key);
  return index === -1 ? ORDER.length : index;
};

/** Evidence as label keys and display values; the two interval ends become one row. */
export function evidenceRows(
  evidence: Record<string, string | number>,
  locale: string,
): EvidenceRow[] {
  const rows: EvidenceRow[] = [];
  const entries = Object.entries(evidence).sort(([a], [b]) => rank(a) - rank(b));
  for (const [key, raw] of entries) {
    if (key === 'rate_ci95_low' || key === 'rate_ci95_high') continue;
    rows.push({ key, value: formatEvidence(key, raw, locale) });
    if (key === 'rate' && 'rate_ci95_low' in evidence && 'rate_ci95_high' in evidence) {
      rows.push({
        key: 'rate_ci95',
        value: `${formatRate(locale, evidence.rate_ci95_low as string)} – ${formatRate(locale, evidence.rate_ci95_high as string)}`,
      });
    }
  }
  return rows;
}

function formatEvidence(key: string, raw: string | number, locale: string): string {
  if (key === 'reason' && typeof raw === 'string') return catalogueText(locale, `reason.${raw}`);
  if (RAW_KEYS.has(key)) return String(raw);
  if (RATE_KEYS.has(key)) return formatRate(locale, raw);
  if (RATIO_KEYS.has(key)) return `${formatDecimal(locale, raw, 2)}×`;
  if (typeof raw === 'number') return formatNumber(locale, raw);
  if (/^-?[0-9]+(\.[0-9]+)?$/.test(raw)) return formatDecimal(locale, raw, 2);
  return raw;
}
