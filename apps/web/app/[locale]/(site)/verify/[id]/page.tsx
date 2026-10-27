import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';

import { SyntheticBadge } from '@/components/ui/Badge';
import { PageHeader, Section } from '@/components/ui/Page';
import { ProofBox } from '@/components/verify/ProofBox';
import { Verifier } from '@/components/verify/Verifier';
import { Link } from '@/i18n/navigation';
import { artifactUrl, getPublication } from '@/lib/data/public';
import { env } from '@/lib/env';
import { pageLocale } from '@/lib/locale';

export async function generateMetadata({
  params,
}: PageProps<'/[locale]/verify/[id]'>): Promise<Metadata> {
  const locale = await pageLocale(params);
  const { id } = await params;
  const publication = await getPublication(id);
  if (!publication) return {};
  const t = await getTranslations({ locale, namespace: 'verify' });
  return {
    title: t('verifyTitle', { series: publication.series_id, sequence: publication.sequence }),
  };
}

export default async function VerifyPage({ params }: PageProps<'/[locale]/verify/[id]'>) {
  await pageLocale(params);
  const { id } = await params;
  const publication = await getPublication(id);
  if (!publication || !publication.manifest_hash) notFound();
  const t = await getTranslations();
  const supabaseUrl = env.supabaseUrl();
  const chain = env.chain();
  const evm = publication.blockchain_anchors.find((anchor) => anchor.anchor_type === 'evm');
  const folder = `${publication.series_id}/${publication.sequence}`;

  return (
    <>
      <PageHeader
        eyebrow={t('verify.eyebrow')}
        title={t('verify.verifyTitle', {
          series: publication.series_id,
          sequence: publication.sequence,
        })}
        lede={t('verify.lede')}
        actions={
          publication.is_synthetic ? (
            <Link href={`/verify/${publication.id}/tamper`} className="btn btn-accent">
              {t('verify.tamperCta')}
            </Link>
          ) : undefined
        }
      >
        {publication.is_synthetic && (
          <div className="mt-4">
            <SyntheticBadge />
          </div>
        )}
      </PageHeader>
      <div className="container-page py-4">
        <Section>
          <Verifier
            publication={{
              seriesId: publication.series_id,
              sequence: publication.sequence,
              manifestHash: publication.manifest_hash,
              retracted: publication.status === 'retracted',
            }}
            artifacts={{
              manifest: artifactUrl(supabaseUrl, `${folder}/manifest.json`),
              report: publication.report_path
                ? artifactUrl(supabaseUrl, publication.report_path)
                : null,
              aggregates: publication.aggregates_path
                ? artifactUrl(supabaseUrl, publication.aggregates_path)
                : null,
            }}
            chain={{
              rpcUrl: chain.rpcUrl,
              registryAddress: evm?.contract_address ?? chain.registryAddress,
              explorerUrl: chain.explorerUrl,
              anchorStatus: evm?.status ?? null,
              txHash: evm?.tx_hash ?? null,
            }}
          />
        </Section>
        <Section>
          <ProofBox />
        </Section>
        <p className="pb-4">
          <Link href={`/publications/${publication.id}`} className="font-semibold">
            ← {t('publication.eyebrow')} {publication.series_id} {publication.sequence}
          </Link>
        </p>
      </div>
    </>
  );
}
