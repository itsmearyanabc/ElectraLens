import 'server-only';

import { findBannedTerm } from '@electralens/i18n';
import { getTranslations } from 'next-intl/server';

import { areaLabels } from '@/lib/areas';
import { getFinding } from '@/lib/data/public';
import { evidenceRows } from '@/lib/evidence';
import { catalogueText, explanationText, parseFinding, ruleName } from '@/lib/findings';

import { generate, GeminiUnavailable } from './gemini';

export type Explanation =
  | { status: 'ok'; text: string; model: string }
  | { status: 'unavailable' | 'not_found' | 'refused' };

const LANGUAGE: Record<string, string> = { en: 'English', hi: 'Hindi (Devanagari script)' };

const SYSTEM = `You explain one statistical finding from ElectraLens, an independent tool that compares published versions of an Indian electoral roll. The reader is an ordinary citizen.
Rules:
- Use only the facts given. Never add numbers, places, people or events that are not in them.
- A finding is an unusual statistical pattern, not proof of wrongdoing. Say so plainly.
- Never accuse anyone, never suggest fraud or intent, and never mention political parties, candidates or officials.
- Give the possible innocent explanations listed as real possibilities.
- End with one practical step: a person can check their own entry, and file a claim or objection, through the official Election Commission services.
- The data is synthetic demonstration data; do not present it as real.
- Write 90 to 140 words in short plain sentences, as two or three short paragraphs. No headings, lists, markdown or emoji.`;

/** Keeps answers per finding and language for the life of the server process. */
const cache = new Map<string, Explanation>();

export async function explainFinding(id: string, locale: string): Promise<Explanation> {
  const cacheKey = `${id}:${locale}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  const row = await getFinding(id);
  const finding = row ? parseFinding(row.finding) : null;
  if (!row || !finding) return { status: 'not_found' };

  const t = await getTranslations({ locale });
  const area = (await areaLabels([row.jurisdiction_id], locale)).get(row.jurisdiction_id);
  const facts = [
    `Rule: ${row.rule_id} — ${ruleName(locale, row.rule_id)}`,
    area ? `Area: ${area.label} (${area.code})` : null,
    `Signal: ${t(`strength.${row.signal_strength}`)} — ${t(`strength.help_${row.signal_strength}`)}`,
    `Human review: ${t(`review.${row.review_status}`)}`,
    `Template explanation: ${explanationText(finding, locale)}`,
    'Evidence:',
    ...evidenceRows(finding.evidence, locale).map(
      (item) =>
        `- ${t.has(`evidence.${item.key}`) ? t(`evidence.${item.key}`) : item.key}: ${item.value}`,
    ),
    finding.baseline
      ? `Compared with: ${finding.baseline.n_units} similar units (${finding.baseline.type}, ${finding.baseline.method})`
      : null,
    'Possible innocent explanations:',
    ...finding.alternative_explanations.map((key) => `- ${catalogueText(locale, key)}`),
    'Limitations:',
    ...finding.limitations.map((key) => `- ${catalogueText(locale, key)}`),
  ].filter((line): line is string => line !== null);

  let answer: { text: string; model: string };
  try {
    answer = await generate(
      SYSTEM,
      `Write the explanation in ${LANGUAGE[locale] ?? 'English'}.\n\nFacts:\n${facts.join('\n')}`,
    );
  } catch (error) {
    if (error instanceof GeminiUnavailable) return { status: 'unavailable' };
    throw error;
  }

  // Plain text only, and nothing that accuses (FR-EXP-4); a refused answer is not cached.
  const clean = answer.text.replace(/[*#_`]+/g, '').trim();
  if (findBannedTerm(clean)) return { status: 'refused' };
  const result: Explanation = {
    status: 'ok',
    text: clean,
    model: answer.model,
  };
  if (cache.size > 500) cache.clear();
  cache.set(cacheKey, result);
  return result;
}
