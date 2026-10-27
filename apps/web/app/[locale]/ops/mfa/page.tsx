import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { AuthCard } from '@/components/ops/AuthCard';
import { MfaForm } from '@/components/ops/AuthForms';
import { redirect } from '@/i18n/navigation';
import { currentUser } from '@/lib/auth';
import { pageLocale } from '@/lib/locale';
import { sessionDb } from '@/lib/supabase/server';

export async function generateMetadata({
  params,
}: PageProps<'/[locale]/ops/mfa'>): Promise<Metadata> {
  const locale = await pageLocale(params);
  const t = await getTranslations({ locale, namespace: 'ops.mfa' });
  return { title: t('challengeTitle'), robots: { index: false } };
}

/** O02: TOTP enrolment on first sign-in, a challenge every time after. */
export default async function MfaPage({ params }: PageProps<'/[locale]/ops/mfa'>) {
  const locale = await pageLocale(params);
  if (!(await currentUser())) redirect({ href: '/ops/login', locale });
  const t = await getTranslations('ops');
  const db = await sessionDb();
  const { data: aal } = await db.auth.mfa.getAuthenticatorAssuranceLevel();
  if (aal?.currentLevel === 'aal2') redirect({ href: '/ops', locale });

  const { data: factors } = await db.auth.mfa.listFactors();
  const verified = factors?.totp.find((factor) => factor.status === 'verified');
  if (verified) {
    return (
      <AuthCard
        eyebrow={t('consoleTitle')}
        title={t('mfa.challengeTitle')}
        lede={t('mfa.challengeLede')}
      >
        <MfaForm factorId={verified.id} />
      </AuthCard>
    );
  }

  // Unfinished enrolments are replaced, so a reload never leaves stale secrets behind.
  for (const factor of factors?.all ?? []) {
    if (factor.factor_type === 'totp' && factor.status !== 'verified')
      await db.auth.mfa.unenroll({ factorId: factor.id });
  }
  const { data: enrolment } = await db.auth.mfa.enroll({
    factorType: 'totp',
    friendlyName: 'ElectraLens console',
  });
  if (!enrolment) return redirect({ href: '/ops/login', locale });

  return (
    <AuthCard eyebrow={t('consoleTitle')} title={t('mfa.enrollTitle')} lede={t('mfa.enrollLede')}>
      <div className="flex flex-col items-center gap-4">
        <img
          src={enrolment.totp.qr_code}
          alt=""
          width={200}
          height={200}
          className="rounded-2xl border border-line p-2"
        />
        <div className="w-full text-center">
          <p className="mono-label">{t('mfa.secret')}</p>
          <code className="hash mt-1 block rounded-xl bg-mist p-2">{enrolment.totp.secret}</code>
        </div>
      </div>
      <div className="mt-6">
        <MfaForm factorId={enrolment.id} />
      </div>
    </AuthCard>
  );
}
