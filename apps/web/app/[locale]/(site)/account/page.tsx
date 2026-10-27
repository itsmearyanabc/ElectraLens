import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { AccountShell } from '@/components/account/AccountShell';
import { Icon, type IconName } from '@/components/ui/Icon';
import { Link } from '@/i18n/navigation';
import { requireUser } from '@/lib/auth';
import { pageLocale } from '@/lib/locale';

export async function generateMetadata({
  params,
}: PageProps<'/[locale]/account'>): Promise<Metadata> {
  const locale = await pageLocale(params);
  const t = await getTranslations({ locale, namespace: 'account' });
  return { title: t('title'), robots: { index: false } };
}

const SECTIONS: [string, string, IconName][] = [
  ['/account/saved', 'Saved', 'file'],
  ['/account/subscriptions', 'Subscriptions', 'pin'],
  ['/account/claims', 'Claims', 'scale'],
  ['/account/settings', 'Settings', 'lock'],
];

export default async function AccountPage({ params }: PageProps<'/[locale]/account'>) {
  const locale = await pageLocale(params);
  const user = await requireUser(locale);
  const t = await getTranslations('account');
  return (
    <AccountShell user={user} title={t('title')}>
      <p className="max-w-2xl text-lg text-muted">{t('lede')}</p>
      <ul className="mt-8 grid gap-5 sm:grid-cols-2">
        {SECTIONS.map(([href, key, icon]) => (
          <li key={href}>
            <Link
              href={href}
              className="card group flex h-full flex-col gap-3 p-6 no-underline transition-all hover:-translate-y-1 hover:shadow-[var(--shadow-float)]"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-saffron-tint text-orange-ink">
                <Icon name={icon} />
              </span>
              <span className="text-lg font-bold text-ink">{t(`overview${key}`)}</span>
              <span className="text-muted">{t(`overview${key}Text`)}</span>
            </Link>
          </li>
        ))}
      </ul>
    </AccountShell>
  );
}
