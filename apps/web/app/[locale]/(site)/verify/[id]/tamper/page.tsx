import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';

import { Notice, PageHeader, Section } from '@/components/ui/Page';
import { TamperDemo } from '@/components/verify/TamperDemo';
import { Link } from '@/i18n/navigation';
import { artifactUrl, getPublication } from '@/lib/data/public';
import { env } from '@/lib/env';
import { pageLocale } from '@/lib/locale';

export async function generateMetadata({
  params,
}: PageProps<'/[locale]/verify/[id]/tamper'>): Promise<Metadata> {
  const locale = await pageLocale(params);
  const t = await getTranslations({ locale, namespace: 'tamper' });
  return { title: t('metaTitle') };
}

export default async function TamperPage({ params }: PageProps<'/[locale]/verify/[id]/tamper'>) {
  await pageLocale(params);
  const { id } = await params;
  const publication = await getPublication(id);
  // FR-INT-6: the tamper demo exists only for synthetic publications.
  if (
    !publication ||
    !publication.is_synthetic ||
    !publication.aggregates_path ||
    !publication.aggregates_hash
  ) {
    notFound();
  }
  const t = await getTranslations();

  return (
    <>
      <PageHeader
        eyebrow={t('tamper.eyebrow')}
        title={t('tamper.title')}
        lede={t('tamper.lede', { series: publication.series_id, sequence: publication.sequence })}
      />
      <div className="container-page py-4">
        <Section>
          <div className="mb-6">
            <Notice tone="caution">{t('tamper.localOnly')}</Notice>
          </div>
          <TamperDemo
            url={artifactUrl(env.supabaseUrl(), publication.aggregates_path)}
            expectedHash={publication.aggregates_hash}
          />
        </Section>
        <p className="pb-4">
          <Link href={`/verify/${publication.id}`} className="font-semibold">
            ← {t('nav.verify')}
          </Link>
        </p>
      </div>
    </>
  );
}
