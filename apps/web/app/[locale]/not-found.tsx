import { getTranslations } from 'next-intl/server';

import { SiteFooter } from '@/components/site/SiteFooter';
import { SiteHeader } from '@/components/site/SiteHeader';
import { Link } from '@/i18n/navigation';

export default async function NotFound() {
  const t = await getTranslations('errors');
  return (
    <>
      <SiteHeader />
      <main id="main" className="container-page flex-1 py-20">
        <p className="eyebrow">404</p>
        <h1 className="mt-2 text-4xl">{t('notFoundTitle')}</h1>
        <p className="mt-4 max-w-xl text-lg text-muted">{t('notFoundBody')}</p>
        <Link href="/" className="btn btn-primary mt-8">
          {t('goHome')}
        </Link>
      </main>
      <SiteFooter />
    </>
  );
}
