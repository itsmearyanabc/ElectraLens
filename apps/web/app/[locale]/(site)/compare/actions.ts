'use server';

import { explainArea } from '@/lib/ai/explainArea';
import type { Explanation } from '@/lib/ai/explainFinding';
import { isAreaCode, isUuid } from '@/lib/data/public';
import { routing } from '@/i18n/routing';

/** An AI-written summary of one area's published changes. Nothing is stored. */
export async function explainAreaAction(
  publicationId: string,
  areaCode: string,
  locale: string,
): Promise<Explanation> {
  if (
    !isUuid(publicationId) ||
    !isAreaCode(areaCode) ||
    !(routing.locales as readonly string[]).includes(locale)
  ) {
    return { status: 'not_found' };
  }
  return explainArea(publicationId, areaCode, locale);
}
