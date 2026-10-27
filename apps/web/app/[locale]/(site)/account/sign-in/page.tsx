import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { SignInForm } from '@/components/account/SignInForm';
import { LogoMark } from '@/components/ui/Logo';
import { Link, redirect } from '@/i18n/navigation';
import { currentUser } from '@/lib/auth';
import { env } from '@/lib/env';
import { pageLocale } from '@/lib/locale';
import { oneOf } from '@/lib/params';

export async function generateMetadata({
  params,
}: PageProps<'/[locale]/account/sign-in'>): Promise<Metadata> {
  const locale = await pageLocale(params);
  const t = await getTranslations({ locale, namespace: 'auth' });
  return { title: t('signInTitle'), robots: { index: false } };
}

const ERRORS = { failed: 'failed', expired: 'linkExpired' } as const;

/** A02: email magic link or Google. There is no EPIC field anywhere (B14.02). */
export default async function SignInPage({
  params,
  searchParams,
}: PageProps<'/[locale]/account/sign-in'>) {
  const locale = await pageLocale(params);
  if (await currentUser()) redirect({ href: '/account', locale });
  const t = await getTranslations();
  const error = oneOf(await searchParams, 'error', ['failed', 'expired'] as const);

  return (
    <div className="glow">
      <div className="container-page grid min-h-[70vh] items-center gap-12 py-16 lg:grid-cols-2">
        <div>
          <p className="eyebrow">{t('account.eyebrow')}</p>
          <h1 className="mt-4 text-[2.75rem] sm:text-[3.5rem]">{t('auth.signInTitle')}</h1>
          <p className="mt-5 max-w-md text-lg text-muted">{t('auth.signInLede')}</p>
          <p className="mt-8 text-sm text-muted">
            {t('auth.staffNote')}{' '}
            <Link href="/ops/login" className="font-bold">
              {t('nav.ops')} →
            </Link>
          </p>
        </div>
        <div className="card-float mx-auto w-full max-w-md p-8 sm:p-10">
          <LogoMark size={44} />
          <div className="mt-6">
            <SignInForm
              initialError={error ? ERRORS[error] : undefined}
              turnstileSiteKey={env.turnstileSiteKey()}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
