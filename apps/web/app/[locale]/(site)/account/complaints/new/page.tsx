import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { AccountShell } from '@/components/account/AccountShell';
import { IntakeChat } from '@/components/complaints/IntakeChat';
import { redirect } from '@/i18n/navigation';
import { areaOptions } from '@/lib/areaOptions';
import { requireUser } from '@/lib/auth';
import { pageLocale } from '@/lib/locale';
import { sessionDb } from '@/lib/supabase/server';

export async function generateMetadata({
  params,
}: PageProps<'/[locale]/account/complaints/new'>): Promise<Metadata> {
  const locale = await pageLocale(params);
  const t = await getTranslations({ locale, namespace: 'complaints.new' });
  return { title: t('title'), robots: { index: false } };
}

/** Only verified citizens can file; the database checks this again when the complaint is filed. */
export default async function NewComplaintPage({
  params,
}: PageProps<'/[locale]/account/complaints/new'>) {
  const locale = await pageLocale(params);
  const user = await requireUser(locale);
  const db = await sessionDb();
  const [{ data: verification }, { data: following }] = await Promise.all([
    db.from('citizen_verifications').select('user_id').eq('user_id', user.id).maybeSingle(),
    db
      .from('user_subscriptions')
      .select('target_id')
      .eq('user_id', user.id)
      .eq('target_type', 'jurisdiction')
      .limit(1),
  ]);
  if (!verification) redirect({ href: '/account/verify', locale });
  const t = await getTranslations('complaints.new');
  const areas = await areaOptions(locale, 3);
  // Start from the area the citizen follows, if any.
  let defaultArea = '';
  const followed = following?.[0]?.target_id;
  if (followed) {
    const { data: area } = await db
      .from('jurisdictions')
      .select('code')
      .eq('id', followed)
      .maybeSingle();
    defaultArea = area?.code ?? '';
  }

  return (
    <AccountShell user={user} title={t('title')}>
      <p className="mb-6 max-w-2xl text-muted">{t('lede')}</p>
      <IntakeChat areas={areas} defaultArea={defaultArea} />
    </AccountShell>
  );
}
