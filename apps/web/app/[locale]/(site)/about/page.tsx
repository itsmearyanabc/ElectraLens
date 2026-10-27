import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { Icon, type IconName } from '@/components/ui/Icon';
import { PageHeader, Section } from '@/components/ui/Page';
import { Link } from '@/i18n/navigation';
import { pageLocale } from '@/lib/locale';

export async function generateMetadata({
  params,
}: PageProps<'/[locale]/about'>): Promise<Metadata> {
  const locale = await pageLocale(params);
  const t = await getTranslations({ locale, namespace: 'about' });
  return { title: t('metaTitle') };
}

const PRINCIPLES: [number, IconName][] = [
  [1, 'file'],
  [2, 'scale'],
  [3, 'users'],
  [4, 'shield'],
  [5, 'lock'],
];

export default async function AboutPage({ params }: PageProps<'/[locale]/about'>) {
  await pageLocale(params);
  const t = await getTranslations();
  return (
    <>
      <PageHeader eyebrow={t('about.eyebrow')} title={t('about.title')} lede={t('about.lede')} />
      <div className="container-page">
        <Section title={t('about.whyTitle')} id="why">
          <p className="max-w-3xl text-xl leading-relaxed text-muted">{t('about.why')}</p>
        </Section>
        <Section title={t('about.principlesTitle')} id="principles">
          <ul className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {PRINCIPLES.map(([n, icon]) => (
              <li key={n} className="card p-7">
                <span
                  className={`flex h-12 w-12 items-center justify-center rounded-2xl ${n % 2 ? 'bg-saffron-tint text-orange-ink' : 'bg-blue-tint text-blue'}`}
                >
                  <Icon name={icon} />
                </span>
                <h3 className="mt-5 text-xl">{t(`about.p${n}Title`)}</h3>
                <p className="mt-2 text-muted">{t(`about.p${n}`)}</p>
              </li>
            ))}
          </ul>
        </Section>
        <Section>
          <div className="on-dark glow-dark rounded-[2rem] p-8 text-white sm:p-12">
            <p className="eyebrow">{t('common.synthetic')}</p>
            <h2 className="mt-3 text-[2rem] !text-white">{t('about.demoTitle')}</h2>
            <p className="mt-4 max-w-3xl text-lg text-white/80">{t('about.demo')}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/methodology" className="btn btn-primary">
                {t('nav.methodology')} <Icon name="arrow" size={18} />
              </Link>
              <Link href="/privacy" className="btn border-white/30 text-white hover:bg-white/10">
                {t('nav.privacy')}
              </Link>
            </div>
          </div>
        </Section>
      </div>
    </>
  );
}
