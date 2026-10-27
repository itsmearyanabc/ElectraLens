import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { AccountShell } from '@/components/account/AccountShell';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/Page';
import { requireUser } from '@/lib/auth';
import { formatDate } from '@/lib/format';
import { pageLocale } from '@/lib/locale';
import { sessionDb } from '@/lib/supabase/server';

export async function generateMetadata({
  params,
}: PageProps<'/[locale]/account/claims'>): Promise<Metadata> {
  const locale = await pageLocale(params);
  const t = await getTranslations({ locale, namespace: 'account' });
  return { title: t('claimsTitle'), robots: { index: false } };
}

const TONE = {
  checked: 'muted',
  in_moderation: 'orange',
  published: 'blue',
  rejected: 'danger',
} as const;

export default async function MyClaimsPage({ params }: PageProps<'/[locale]/account/claims'>) {
  const locale = await pageLocale(params);
  const user = await requireUser(locale);
  const t = await getTranslations('account');
  const db = await sessionDb();
  // RLS returns only this person's own claims (plus published ones), so filter to the submitter.
  const { data } = await db
    .from('claim_submissions')
    .select('id, text, status, created_at')
    .eq('submitter_id', user.id)
    .order('created_at', { ascending: false });
  const claims = data ?? [];

  return (
    <AccountShell user={user} title={t('claimsTitle')}>
      {claims.length === 0 ? (
        <EmptyState title={t('claimsEmpty')} />
      ) : (
        <ul className="space-y-3">
          {claims.map((claim) => (
            <li key={claim.id} className="card p-5">
              <div className="flex flex-wrap items-center gap-3">
                <Badge tone={TONE[claim.status]}>{t(`claimStatus.${claim.status}`)}</Badge>
                <span className="text-sm text-muted">{formatDate(locale, claim.created_at)}</span>
              </div>
              <p className="mt-3 text-lg">“{claim.text}”</p>
            </li>
          ))}
        </ul>
      )}
    </AccountShell>
  );
}
