import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { AccountShell } from '@/components/account/AccountShell';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/Page';
import { requireUser } from '@/lib/auth';
import { getAreasByIds, getChildAreas, getTopAreas } from '@/lib/data/public';
import { localName } from '@/lib/data/types';
import { pageLocale } from '@/lib/locale';
import { sessionDb } from '@/lib/supabase/server';

import { followArea, unfollow } from '../actions';

export async function generateMetadata({
  params,
}: PageProps<'/[locale]/account/subscriptions'>): Promise<Metadata> {
  const locale = await pageLocale(params);
  const t = await getTranslations({ locale, namespace: 'account' });
  return { title: t('subscriptionsTitle'), robots: { index: false } };
}

export default async function SubscriptionsPage({
  params,
}: PageProps<'/[locale]/account/subscriptions'>) {
  const locale = await pageLocale(params);
  const user = await requireUser(locale);
  const t = await getTranslations();
  const db = await sessionDb();
  const { data } = await db
    .from('user_subscriptions')
    .select('id, target_type, target_id, created_at');
  const subscriptions = data ?? [];
  const areas = await getAreasByIds(
    subscriptions.filter((s) => s.target_type === 'jurisdiction').map((s) => s.target_id),
  );
  const options: { code: string; label: string }[] = [];
  for (const state of await getTopAreas()) {
    options.push({ code: state.code, label: localName(state.name, locale) });
    for (const district of await getChildAreas(state.id)) {
      options.push({ code: district.code, label: `— ${localName(district.name, locale)}` });
      for (const ac of await getChildAreas(district.id))
        options.push({ code: ac.code, label: `—— ${localName(ac.name, locale)}` });
    }
  }

  return (
    <AccountShell user={user} title={t('account.subscriptionsTitle')}>
      <form
        action={followArea}
        className="card mb-8 flex flex-col gap-3 p-5 sm:flex-row sm:items-end"
      >
        <div className="flex-1">
          <label htmlFor="follow-area" className="label">
            {t('account.followArea')}
          </label>
          <select id="follow-area" name="area" className="field">
            {options.map((option) => (
              <option key={option.code} value={option.code}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <button type="submit" className="btn btn-primary">
          {t('account.follow')}
        </button>
      </form>
      {subscriptions.length === 0 ? (
        <EmptyState title={t('account.subscriptionsEmpty')} />
      ) : (
        <ul className="space-y-3">
          {subscriptions.map((subscription) => {
            const area = areas.get(subscription.target_id);
            return (
              <li
                key={subscription.id}
                className="card flex items-center justify-between gap-4 p-5"
              >
                <span className="flex items-center gap-3">
                  <Badge tone="orange">{t(`account.targetType.${subscription.target_type}`)}</Badge>
                  <span className="font-bold">
                    {area ? localName(area.name, locale) : subscription.target_id}
                  </span>
                </span>
                <form action={unfollow}>
                  <input type="hidden" name="id" value={subscription.id} />
                  <button type="submit" className="btn btn-ghost btn-sm">
                    {t('common.remove')}
                  </button>
                </form>
              </li>
            );
          })}
        </ul>
      )}
    </AccountShell>
  );
}
