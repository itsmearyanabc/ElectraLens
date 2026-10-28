import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { AuthCard } from '@/components/ops/AuthCard';
import { StaffLoginForm } from '@/components/ops/AuthForms';
import { env } from '@/lib/env';
import { Link } from '@/i18n/navigation';
import { pageLocale } from '@/lib/locale';
import { one } from '@/lib/params';

export async function generateMetadata({
  params,
}: PageProps<'/[locale]/ops/login'>): Promise<Metadata> {
  const locale = await pageLocale(params);
  const t = await getTranslations({ locale, namespace: 'ops.login' });
  return { title: t('title'), robots: { index: false } };
}

/** O01: email and password; the second factor follows on /ops/mfa (B14.08). */
export default async function StaffLoginPage({
  params,
  searchParams,
}: PageProps<'/[locale]/ops/login'>) {
  await pageLocale(params);
  const t = await getTranslations('ops');
  const notStaff = one(await searchParams, 'error') === 'not_staff';
  return (
    <AuthCard eyebrow={t('consoleTitle')} title={t('login.title')} lede={t('login.lede')}>
      <StaffLoginForm notStaff={notStaff} turnstileSiteKey={env.turnstileSiteKey()} />
      <p className="mt-6 text-center text-sm">
        <Link href="/account/sign-in">{t('login.citizen')}</Link>
      </p>
    </AuthCard>
  );
}
