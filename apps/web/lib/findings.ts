import { CATALOGUES } from '@electralens/i18n';
import { findingV1, RULE_IDS, type FindingV1 } from '@electralens/schemas';

import type { Json } from './data/types';

export { RULE_IDS };

/** Text from the catalogue shared with the engine (rule names, alternatives, limitations). */
export function catalogueText(locale: string, key: string): string {
  return CATALOGUES[locale]?.[key] ?? CATALOGUES.en?.[key] ?? key;
}

export const ruleName = (locale: string, ruleId: string) =>
  catalogueText(locale, `rule.${ruleId}.name`);

/**
 * The finding document exactly as the engine produced it. Rows that don't parse are shown as
 * unavailable rather than half-rendered.
 */
export function parseFinding(value: Json): FindingV1 | null {
  const parsed = findingV1.safeParse(value);
  return parsed.success ? parsed.data : null;
}

/** The explanation in the reader's language, falling back to English. */
export function explanationText(finding: FindingV1, locale: string): string {
  const explanation = finding.explanation as Record<string, string>;
  return explanation[locale] ?? explanation.en ?? '';
}

/** Evidence keys that are statistical intervals, shown together rather than as separate rows. */
export const INTERVAL_KEYS = new Set(['rate_ci95_low', 'rate_ci95_high']);
