import { getTranslations } from 'next-intl/server';

import { Badge, type Tone } from '@/components/ui/Badge';
import type { Enums } from '@/lib/data/types';

const TONE: Record<Enums['claim_verdict'], Tone> = {
  consistent: 'blue',
  contradicted: 'danger',
  disputed: 'orange',
  cannot_establish: 'muted',
};

export async function VerdictBadge({ verdict }: { verdict: Enums['claim_verdict'] }) {
  const t = await getTranslations('claims.verdict');
  return <Badge tone={TONE[verdict]}>{t(verdict)}</Badge>;
}
