import { getTranslations } from 'next-intl/server';

import type { Enums } from '@/lib/data/types';

// Colour always comes with words: no badge relies on colour alone (NFR-7).
const TONES = {
  navy: { chip: 'bg-ink text-white', dot: 'bg-saffron' },
  blue: { chip: 'bg-blue-tint text-blue-deep', dot: 'bg-blue' },
  saffron: { chip: 'bg-peach text-orange-deep', dot: 'bg-saffron' },
  orange: { chip: 'bg-saffron-tint text-orange-deep', dot: 'bg-saffron' },
  muted: { chip: 'bg-mist text-muted ring-1 ring-line', dot: 'bg-subtle' },
  danger: { chip: 'bg-danger-tint text-danger', dot: 'bg-danger' },
} as const;

export type Tone = keyof typeof TONES;

/** A chip: a dot and words. Colour always comes with words (NFR-7). */
export function Badge({
  tone = 'muted',
  children,
  title,
  dot = true,
}: {
  tone?: Tone;
  children: React.ReactNode;
  title?: string;
  dot?: boolean;
}) {
  return (
    <span
      title={title}
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[0.8125rem] font-semibold whitespace-nowrap ${TONES[tone].chip}`}
    >
      {dot && <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${TONES[tone].dot}`} />}
      {children}
    </span>
  );
}

const LABEL_TONE: Record<Enums['content_label'], Tone> = {
  source_data: 'blue',
  analytical_finding: 'orange',
  user_claim: 'muted',
  unverified: 'danger',
  confirmed_correction: 'navy',
};

/** B09.12: the one content label used everywhere. */
export async function LabelBadge({ label }: { label: Enums['content_label'] }) {
  const t = await getTranslations();
  return (
    <Badge tone={LABEL_TONE[label]} title={t(`labelHelp.${label}`)}>
      {t(`labels.${label}`)}
    </Badge>
  );
}

const STRENGTH_TONE: Record<Enums['signal_strength'], Tone> = {
  strong: 'navy',
  moderate: 'blue',
  weak: 'muted',
  data_quality: 'orange',
};

const STRENGTH_BARS: Record<Enums['signal_strength'], number> = {
  strong: 3,
  moderate: 2,
  weak: 1,
  data_quality: 0,
};

export async function SignalBadge({ strength }: { strength: Enums['signal_strength'] }) {
  const t = await getTranslations('strength');
  const bars = STRENGTH_BARS[strength];
  return (
    <Badge tone={STRENGTH_TONE[strength]} title={t(`help_${strength}`)} dot={bars === 0}>
      {bars > 0 && (
        <span aria-hidden="true" className="inline-flex items-end gap-px">
          {[1, 2, 3].map((n) => (
            <span
              key={n}
              className={`w-1 rounded-sm ${n <= bars ? 'bg-current' : 'bg-current opacity-30'} ${n === 1 ? 'h-1.5' : n === 2 ? 'h-2.5' : 'h-3.5'}`}
            />
          ))}
        </span>
      )}
      {t(strength)}
    </Badge>
  );
}

const REVIEW_TONE: Record<Enums['review_decision'], Tone> = {
  pending: 'muted',
  accepted: 'blue',
  downgraded: 'orange',
  rejected: 'danger',
};

export async function ReviewBadge({ status }: { status: Enums['review_decision'] }) {
  const t = await getTranslations('review');
  return <Badge tone={REVIEW_TONE[status]}>{t(status)}</Badge>;
}

const PUBLICATION_TONE: Record<Enums['publication_status'], Tone> = {
  draft: 'muted',
  preparing: 'muted',
  in_review: 'orange',
  approved: 'blue',
  published: 'navy',
  retracted: 'danger',
  withdrawn: 'muted',
};

export async function PublicationStatusBadge({ status }: { status: Enums['publication_status'] }) {
  const t = await getTranslations('pubStatus');
  return <Badge tone={PUBLICATION_TONE[status]}>{t(status)}</Badge>;
}

export async function SyntheticBadge() {
  const t = await getTranslations('common');
  return (
    <Badge tone="saffron" title={t('syntheticNotice')}>
      {t('synthetic')}
    </Badge>
  );
}
