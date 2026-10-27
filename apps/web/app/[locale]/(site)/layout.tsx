import { SiteFooter } from '@/components/site/SiteFooter';
import { SiteHeader } from '@/components/site/SiteHeader';
import { pageLocale } from '@/lib/locale';

export default async function SiteLayout({ children, params }: LayoutProps<'/[locale]'>) {
  await pageLocale(params);
  return (
    <>
      <SiteHeader />
      <main id="main" tabIndex={-1} className="flex-1 focus:outline-none">
        {children}
      </main>
      <SiteFooter />
    </>
  );
}
