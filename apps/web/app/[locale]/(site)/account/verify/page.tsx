import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { AccountShell } from '@/components/account/AccountShell';
import { EkycForm } from '@/components/complaints/EkycForm';
import { Notice } from '@/components/ui/Page';
import { Link } from '@/i18n/navigation';
import { requireUser } from '@/lib/auth';
import { formatDate } from '@/lib/format';
import { pageLocale } from '@/lib/locale';
import { sessionDb } from '@/lib/supabase/server';

export async function generateMetadata({
  params,
}: PageProps<'/[locale]/account/verify'>): Promise<Metadata> {
  const locale = await pageLocale(params);
  const t = await getTranslations({ locale, namespace: 'complaints.ekyc' });
  return { title: t('title'), robots: { index: false } };
}

/** Identity check before filing complaints (simulated e-KYC; see the migration for why). */
export default async function VerifyPage({ params }: PageProps<'/[locale]/account/verify'>) {
  const locale = await pageLocale(params);
  const user = await requireUser(locale);
  const t = await getTranslations('complaints.ekyc');
  const db = await sessionDb();
  const { data: verification } = await db
    .from('citizen_verifications')
    .select('verified_name, aadhaar_last4, verified_at')
    .eq('user_id', user.id)
    .maybeSingle();

  return (
    <AccountShell user={user} title={t('title')}>
      <div className="max-w-xl space-y-6">
        <p className="text-lg text-muted">{t('lede')}</p>
        {verification ? (
          <Notice tone="info" title={t('done')}>
            {t('doneText', {
              name: verification.verified_name,
              last4: verification.aadhaar_last4,
              date: formatDate(locale, verification.verified_at),
            })}{' '}
            <Link href="/account/complaints/new" className="font-bold">
              {t('raise')} →
            </Link>
          </Notice>
        ) : (
          <div className="card p-6">
            <EkycForm />
          </div>
        )}
        <p className="text-sm text-muted">{t('production')}</p>
      </div>
    </AccountShell>
  );
}
