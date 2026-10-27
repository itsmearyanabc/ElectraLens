import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { Icon } from '@/components/ui/Icon';
import { PageHeader, Section, TableWrap } from '@/components/ui/Page';
import { pageLocale } from '@/lib/locale';

export async function generateMetadata({
  params,
}: PageProps<'/[locale]/privacy'>): Promise<Metadata> {
  const locale = await pageLocale(params);
  const t = await getTranslations({ locale, namespace: 'privacy' });
  return { title: t('metaTitle') };
}

const ROWS = ['Account', 'Saved', 'Claims', 'Ip', 'Security'] as const;

export default async function PrivacyPage({ params }: PageProps<'/[locale]/privacy'>) {
  await pageLocale(params);
  const t = await getTranslations('privacy');
  return (
    <>
      <PageHeader eyebrow={t('eyebrow')} title={t('title')} lede={t('lede')} />
      <div className="container-page">
        <Section title={t('neverTitle')} id="never">
          <ul className="grid gap-5 md:grid-cols-3">
            {(['never1', 'never2', 'never3'] as const).map((key) => (
              <li key={key} className="card flex gap-4 p-6">
                <span
                  aria-hidden="true"
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-peach font-bold text-orange-deep"
                >
                  ✕
                </span>
                <span>{t(key)}</span>
              </li>
            ))}
          </ul>
        </Section>
        <Section title={t('collectTitle')} id="collect">
          <TableWrap label={t('collectTitle')}>
            <thead>
              <tr>
                <th scope="col">{t('item')}</th>
                <th scope="col">{t('why')}</th>
                <th scope="col">{t('kept')}</th>
              </tr>
            </thead>
            <tbody>
              {ROWS.map((row) => (
                <tr key={row}>
                  <th scope="row">{t(`row${row}`)}</th>
                  <td className="text-muted">{t(`row${row}Why`)}</td>
                  <td className="font-semibold whitespace-nowrap">{t(`row${row}Kept`)}</td>
                </tr>
              ))}
            </tbody>
          </TableWrap>
        </Section>
        <div className="grid gap-5 pb-4 md:grid-cols-2">
          {(['cookies', 'delete'] as const).map((key) => (
            <div key={key} className="card p-7">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-tint text-blue">
                <Icon name="lock" />
              </span>
              <h2 className="mt-4 text-[1.625rem]">{t(`${key}Title`)}</h2>
              <p className="mt-2 text-muted">{t(key)}</p>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
