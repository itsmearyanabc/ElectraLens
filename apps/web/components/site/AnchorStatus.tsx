import { getTranslations } from 'next-intl/server';

import { Badge, type Tone } from '@/components/ui/Badge';
import type { Enums } from '@/lib/data/types';

const TONE: Record<Enums['anchor_status'], Tone> = {
  pending: 'orange',
  submitted: 'orange',
  confirmed: 'navy',
  upgraded: 'navy',
  failed: 'danger',
};

export async function AnchorStatusBadge({ status }: { status: Enums['anchor_status'] }) {
  const t = await getTranslations('anchorStatus');
  return <Badge tone={TONE[status]}>{t(status)}</Badge>;
}
