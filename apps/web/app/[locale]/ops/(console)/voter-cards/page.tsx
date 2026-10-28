import { getTranslations } from 'next-intl/server';

import { OpsHeader } from '@/components/ops/OpsUi';
import { Badge, SyntheticBadge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/Page';
import { areaLabels } from '@/lib/areas';
import { requireStaff } from '@/lib/auth';
import { localName } from '@/lib/data/types';
import { pageLocale } from '@/lib/locale';
import { voterCardQrDataUri } from '@/lib/qr';
import { sessionDb } from '@/lib/supabase/server';

/**
 * Demo voter cards for the areas this person covers: the sysadmin (all areas) sees every card,
 * other staff only cards whose booth is in their assigned area. The database does the scoping;
 * PINs and the year-by-year record never leave it.
 */
export default async function OpsVoterCards({ params }: PageProps<'/[locale]/ops/voter-cards'>) {
  const locale = await pageLocale(params);
  const staff = await requireStaff(locale);
  const t = await getTranslations('ops.voterCards');
  const db = await sessionDb();
  const { data } = await db.rpc('staff_voter_cards');
  const cards = data ?? [];
  const [labels, qr] = await Promise.all([
    areaLabels(
      cards.map((card) => card.ac_id),
      locale,
    ),
    Promise.all(cards.map((card) => voterCardQrDataUri(card.card_code))),
  ]);
  const everyArea = staff.roles.some((role) => role.jurisdiction_id === null);

  return (
    <>
      <OpsHeader
        title={t('title')}
        lede={
          everyArea ? t('ledeAll', { count: cards.length }) : t('ledeArea', { count: cards.length })
        }
      />
      {cards.length === 0 ? (
        <EmptyState title={t('empty')} />
      ) : (
        <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {cards.map((card, index) => (
            <li key={card.card_code} className="card flex gap-4 p-5">
              <img
                src={qr[index]}
                alt={t('qrAlt', { name: card.holder_name })}
                className="h-28 w-28 shrink-0"
              />
              <div className="min-w-0 space-y-1.5">
                <p className="font-bold text-ink">{card.holder_name}</p>
                <p className="hash text-sm">{card.card_number}</p>
                <p className="text-sm text-muted">
                  {t('details', {
                    born: card.birth_year ?? '—',
                    part: card.part_number ?? '—',
                    serial: card.serial_number ?? '—',
                  })}
                </p>
                <p className="text-sm">
                  {localName(card.booth_name, locale)}
                  <span className="text-muted"> · {labels.get(card.ac_id)?.label ?? '—'}</span>
                </p>
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <Badge tone={card.missed === 0 ? 'blue' : card.missed > 1 ? 'orange' : 'muted'}>
                    {t('missed', { missed: card.missed, total: card.elections })}
                  </Badge>
                  <SyntheticBadge />
                </div>
                <a href={`/${locale}/v/${card.card_code}`} className="text-sm font-bold">
                  {t('open')} →
                </a>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
