import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { AccountShell } from '@/components/account/AccountShell';
import { Badge } from '@/components/ui/Badge';
import { EmptyState, Notice } from '@/components/ui/Page';
import { Link } from '@/i18n/navigation';
import { requireUser } from '@/lib/auth';
import { STATUS_TONE, type ComplaintStatus } from '@/lib/complaints';
import { formatDate } from '@/lib/format';
import { pageLocale } from '@/lib/locale';
import { one } from '@/lib/params';
import { sessionDb } from '@/lib/supabase/server';

export async function generateMetadata({
  params,
}: PageProps<'/[locale]/account/complaints'>): Promise<Metadata> {
  const locale = await pageLocale(params);
  const t = await getTranslations({ locale, namespace: 'complaints' });
  return { title: t('title'), robots: { index: false } };
}

export default async function MyComplaintsPage({
  params,
  searchParams,
}: PageProps<'/[locale]/account/complaints'>) {
  const locale = await pageLocale(params);
  const user = await requireUser(locale);
  const t = await getTranslations('complaints');
  const justVerified = one(await searchParams, 'verified') === '1';
  const db = await sessionDb();
  const [{ data: verification }, { data }] = await Promise.all([
    db.from('citizen_verifications').select('user_id').eq('user_id', user.id).maybeSingle(),
    db
      .from('complaints')
      .select('id, reference, title, status, category, created_at, updated_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false }),
  ]);
  const complaints = data ?? [];

  return (
    <AccountShell user={user} title={t('title')}>
      <div className="space-y-6">
        {justVerified && <Notice tone="info" title={t('ekyc.done')} />}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <p className="max-w-xl text-muted">{t('lede')}</p>
          {verification ? (
            <Link href="/account/complaints/new" className="btn btn-primary">
              {t('raise')}
            </Link>
          ) : (
            <Link href="/account/verify" className="btn btn-primary">
              {t('verifyFirst')}
            </Link>
          )}
        </div>
        {complaints.length === 0 ? (
          <EmptyState title={t('empty')} />
        ) : (
          <ul className="space-y-3">
            {complaints.map((complaint) => (
              <li key={complaint.id}>
                <Link
                  href={`/account/complaints/${complaint.id}`}
                  className="card block p-5 no-underline hover:border-ink"
                >
                  <div className="flex flex-wrap items-center gap-3">
                    <Badge tone={STATUS_TONE[complaint.status as ComplaintStatus]}>
                      {t(`status.${complaint.status}`)}
                    </Badge>
                    <span className="hash text-sm">{complaint.reference}</span>
                    <span className="text-sm text-muted">
                      {t(`category.${complaint.category}`)} ·{' '}
                      {formatDate(locale, complaint.created_at)}
                    </span>
                  </div>
                  <p className="mt-2 text-lg font-semibold text-ink">{complaint.title}</p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </AccountShell>
  );
}
