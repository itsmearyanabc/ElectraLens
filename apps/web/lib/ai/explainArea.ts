import 'server-only';

import { findBannedTerm } from '@electralens/i18n';

import { compareArea, type AreaChange } from '@/lib/areaStats';
import { getArea, getPublication } from '@/lib/data/public';
import { localName } from '@/lib/data/types';
import type { RateLevel } from '@/lib/levels';

import type { Explanation } from './explainFinding';
import { generate, GeminiUnavailable } from './gemini';

const LANGUAGE: Record<string, string> = { en: 'English', hi: 'Hindi (Devanagari script)' };

const SYSTEM = `You summarise how one area's electoral roll changed between two published versions, for ElectraLens, an independent tool. The reader is an ordinary citizen.
Rules:
- Use only the facts given. Never add numbers, places, people or events.
- Each rate already has a level computed by a fixed statistical rule: Normal, Unusual or Highly unusual compared with the neighbouring areas. Repeat those levels; never change or invent one.
- Unusual is not proof of wrongdoing. Never accuse anyone, never suggest fraud or intent, never mention parties, candidates or officials.
- Mention that common causes of unusual changes include house-to-house revisions, people moving, deaths recorded together, part reorganisation and removal of repeated entries.
- The data is synthetic demonstration data.
- Write 80 to 130 words in short plain sentences, as two short paragraphs. No headings, lists, markdown or emoji.`;

const cache = new Map<string, Explanation>();

const pct = (rate: number | null) =>
  rate === null ? 'not published' : `${(rate * 100).toFixed(1)}%`;
const levelText = (level: RateLevel | null) =>
  level
    ? `${level.level.replace('_', ' ')} (${level.direction} than the neighbours' median of ${pct(level.peerMedian)})`
    : 'no level (too few comparable areas or a suppressed value)';

function describe(row: AreaChange, locale: string): string {
  return [
    `${localName(row.area.name, locale)} (${row.area.code}, ${row.area.level})`,
    `earlier roll ${row.baseline ?? 'suppressed'}, later roll ${row.target ?? 'suppressed'}, net change ${row.net ?? 'n/a'}`,
    `additions ${row.additions ?? '< 10'} (${pct(row.additionRate)}): ${levelText(row.additionLevel)}`,
    `deletions ${row.deletions ?? '< 10'} (${pct(row.deletionRate)}): ${levelText(row.deletionLevel)}`,
  ].join('; ');
}

/** An AI-written summary of one area's published changes and their levels. Nothing is stored. */
export async function explainArea(
  publicationId: string,
  areaCode: string,
  locale: string,
): Promise<Explanation> {
  const cacheKey = `${publicationId}:${areaCode}:${locale}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  const [publication, area] = await Promise.all([getPublication(publicationId), getArea(areaCode)]);
  if (!publication || !area) return { status: 'not_found' };
  const comparison = await compareArea(publication.id, area);
  const flagged = comparison.children.filter(
    (row) =>
      (row.additionLevel && row.additionLevel.level !== 'normal') ||
      (row.deletionLevel && row.deletionLevel.level !== 'normal'),
  );
  const facts = [
    `Publication ${publication.series_id} number ${publication.sequence}.`,
    `This area, compared with the ${comparison.peerCount} areas under ${comparison.parent ? localName(comparison.parent.name, locale) : 'the same parent'}: ${describe(comparison.self, locale)}.`,
    comparison.children.length
      ? `It contains ${comparison.children.length} smaller areas; ${flagged.length} of them have an unusual addition or deletion rate compared with each other.`
      : 'It is the smallest published area.',
    ...flagged.slice(0, 6).map((row) => `- ${describe(row, locale)}`),
  ];

  let answer: { text: string; model: string };
  try {
    answer = await generate(
      SYSTEM,
      `Write the summary in ${LANGUAGE[locale] ?? 'English'}.\n\nFacts:\n${facts.join('\n')}`,
    );
  } catch (error) {
    if (error instanceof GeminiUnavailable) return { status: 'unavailable' };
    throw error;
  }
  const clean = answer.text.replace(/[*#_`]+/g, '').trim();
  if (findBannedTerm(clean)) return { status: 'refused' };
  const result: Explanation = { status: 'ok', text: clean, model: answer.model };
  if (cache.size > 500) cache.clear();
  cache.set(cacheKey, result);
  return result;
}
