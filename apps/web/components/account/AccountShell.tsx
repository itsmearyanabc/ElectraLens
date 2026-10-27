import type { User } from '@supabase/supabase-js';
import { getLocale, getTranslations } from 'next-intl/server';
import type { ReactNode } from 'react';

import { NavLinks } from '@/components/site/NavLinks';
import { PageHeader } from '@/components/ui/Page';

/** Account pages: header, section nav and a sign-out button that posts (never a GET link). */
export async function AccountShell({
  user,
  title,
  children,
}: {
  user: User;
  title: string;
  children: ReactNode;
}) {
  const t = await getTranslations();
  const locale = await getLocale();
  return (
    <>
      <PageHeader eyebrow={t('account.signedInAs', { email: user.email ?? '' })} title={title} />
      <div className="container-page grid gap-8 py-12 lg:grid-cols-[16rem_1fr]">
        <aside>
          <nav aria-label={t('account.nav')} className="card overflow-hidden">
            <NavLinks
              vertical
              items={[
                { href: '/account', label: t('account.title') },
                { href: '/account/saved', label: t('account.overviewSaved') },
                { href: '/account/subscriptions', label: t('account.overviewSubscriptions') },
                { href: '/account/claims', label: t('account.overviewClaims') },
                { href: '/account/settings', label: t('account.overviewSettings') },
              ]}
            />
          </nav>
          <form action="/auth/sign-out" method="post" className="mt-4">
            <input type="hidden" name="next" value={`/${locale}`} />
            <button type="submit" className="btn btn-ghost w-full">
              {t('common.signOut')}
            </button>
          </form>
        </aside>
        <div className="min-w-0">{children}</div>
      </div>
    </>
  );
}
