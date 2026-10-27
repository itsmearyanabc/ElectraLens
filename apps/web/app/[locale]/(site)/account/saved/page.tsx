import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { AccountShell } from '@/components/account/AccountShell';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/Page';
import { Link } from '@/i18n/navigation';
import { requireUser } from '@/lib/auth';
import { formatDate } from '@/lib/format';
import { pageLocale } from '@/lib/locale';
import { sessionDb } from '@/lib/supabase/server';

import { removeSavedItem } from '../actions';

export async function generateMetadata({
  params,
}: PageProps<'/[locale]/account/saved'>): Promise<Metadata> {
  const locale = await pageLocale(params);
  const t = await getTranslations({ locale, namespace: 'account' });
  return { title: t('savedTitle'), robots: { index: false } };
}

const HREF = { publication: '/publications/', finding: '/findings/', booth: '/b/' } as const;

export default async function SavedPage({ params }: PageProps<'/[locale]/account/saved'>) {
  const locale = await pageLocale(params);
  const user = await requireUser(locale);
  const t = await getTranslations();
  const db = await sessionDb();
  const { data } = await db
    .from('saved_items')
    .select('id, item_type, item_id, created_at')
    .order('created_at', { ascending: false });
  const items = data ?? [];

  return (
    <AccountShell user={user} title={t('account.savedTitle')}>
      {items.length === 0 ? (
        <EmptyState title={t('account.savedEmpty')} />
      ) : (
        <ul className="space-y-3">
          {items.map((item) => (
            <li
              key={item.id}
              className="card flex flex-wrap items-center justify-between gap-4 p-5"
            >
              <span className="flex flex-wrap items-center gap-3">
                <Badge tone="blue">{t(`account.itemType.${item.item_type}`)}</Badge>
                <Link
                  href={`${HREF[item.item_type as keyof typeof HREF]}${item.item_id}`}
                  className="font-bold"
                >
                  {item.item_id.slice(0, 8)}
                </Link>
                <span className="text-sm text-muted">
                  {t('account.savedOn', { date: formatDate(locale, item.created_at) })}
                </span>
              </span>
              <form action={removeSavedItem}>
                <input type="hidden" name="id" value={item.id} />
                <button type="submit" className="btn btn-ghost btn-sm">
                  {t('common.remove')}
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}
    </AccountShell>
  );
}
