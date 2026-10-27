'use server';

import { explainFinding, type Explanation } from '@/lib/ai/explainFinding';
import { routing } from '@/i18n/routing';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** An AI-written plain-language explanation of one published finding. Nothing is stored. */
export async function explainFindingAction(id: string, locale: string): Promise<Explanation> {
  if (!UUID.test(id) || !(routing.locales as readonly string[]).includes(locale)) {
    return { status: 'not_found' };
  }
  return explainFinding(id, locale);
}
