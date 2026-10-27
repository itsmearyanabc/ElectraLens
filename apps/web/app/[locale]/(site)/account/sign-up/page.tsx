import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { SignUpForm } from '@/components/account/SignUpForm';
import { LogoMark } from '@/components/ui/Logo';
import { Link, redirect } from '@/i18n/navigation';
import { currentUser } from '@/lib/auth';
import { areaTree, getTopAreas } from '@/lib/data/public';
import { localName } from '@/lib/data/types';
import { env } from '@/lib/env';
import { pageLocale } from '@/lib/locale';

export async function generateMetadata({
  params,
}: PageProps<'/[locale]/account/sign-up'>): Promise<Metadata> {
  const locale = await pageLocale(params);
  const t = await getTranslations({ locale, namespace: 'auth' });
  return { title: t('signUpTitle'), robots: { index: false } };
}

/** Create a citizen account: name, language, home area, updates. There is no EPIC field. */
export default async function SignUpPage({ params }: PageProps<'/[locale]/account/sign-up'>) {
  const locale = await pageLocale(params);
  if (await currentUser()) redirect({ href: '/account', locale });
  const t = await getTranslations();
  // States, districts and constituencies: enough to follow, without picking a single part.
  const trees = await Promise.all((await getTopAreas()).map((top) => areaTree(top.id)));
  const areas = trees
    .flat()
    .filter(({ depth }) => depth <= 2)
    .map(({ area, depth }) => ({
      code: area.code,
      label: `${localName(area.name, locale)} · ${t(`level.${area.level}`)}`,
      depth,
    }));

  return (
    <div className="glow">
      <div className="container-page grid min-h-[70vh] items-center gap-12 py-16 lg:grid-cols-2">
        <div>
          <p className="eyebrow">{t('account.eyebrow')}</p>
          <h1 className="mt-4 text-[2.75rem] sm:text-[3.5rem]">{t('auth.signUpTitle')}</h1>
          <p className="mt-5 max-w-md text-lg text-muted">{t('auth.signUpLede')}</p>
          <ul className="mt-6 max-w-md space-y-2 text-muted">
            {(t.raw('auth.signUpBenefits') as string[]).map((benefit) => (
              <li key={benefit} className="flex gap-2">
                <span aria-hidden="true" className="font-bold text-saffron">
                  ✓
                </span>
                {benefit}
              </li>
            ))}
          </ul>
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
            <SignUpForm areas={areas} turnstileSiteKey={env.turnstileSiteKey()} />
          </div>
        </div>
      </div>
    </div>
  );
}
