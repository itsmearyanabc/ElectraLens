import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';

import { AnchorStatusBadge } from '@/components/site/AnchorStatus';
import { PublicationStatusBadge, SyntheticBadge } from '@/components/ui/Badge';
import { DefinitionList, Hash, Notice, PageHeader, Section, TableWrap } from '@/components/ui/Page';
import { Link } from '@/i18n/navigation';
import { artifactUrl, getPublication, getSupersedingPublications } from '@/lib/data/public';
import { env } from '@/lib/env';
import { formatDate, formatDateTime, formatNumber } from '@/lib/format';
import { pageLocale } from '@/lib/locale';
import type { ManifestV1 } from '@electralens/schemas';

export async function generateMetadata({
  params,
}: PageProps<'/[locale]/publications/[id]'>): Promise<Metadata> {
  const locale = await pageLocale(params);
  const { id } = await params;
  const publication = await getPublication(id);
  if (!publication) return {};
  const t = await getTranslations({ locale, namespace: 'publication' });
  return {
    title: t('metaTitle', { series: publication.series_id, sequence: publication.sequence }),
  };
}

export default async function PublicationPage({
  params,
}: PageProps<'/[locale]/publications/[id]'>) {
  const locale = await pageLocale(params);
  const { id } = await params;
  const publication = await getPublication(id);
  if (!publication) notFound();
  const t = await getTranslations();
  const superseding = await getSupersedingPublications(publication.id);
  const manifest = publication.manifest as unknown as ManifestV1 | null;
  const supabaseUrl = env.supabaseUrl();
  const chain = env.chain();
  const folder = `${publication.series_id}/${publication.sequence}`;
  const downloads = [
    {
      label: t('publication.fileManifest'),
      path: `${folder}/manifest.json`,
      hash: publication.manifest_hash,
    },
    {
      label: t('publication.fileReport'),
      path: publication.report_path,
      hash: publication.report_hash,
    },
    {
      label: t('publication.fileAggregates'),
      path: publication.aggregates_path,
      hash: publication.aggregates_hash,
    },
  ];

  return (
    <>
      <PageHeader
        eyebrow={t('publication.eyebrow')}
        title={t('publication.title', {
          series: publication.series_id,
          sequence: publication.sequence,
        })}
        actions={
          <>
            <Link href={`/verify/${publication.id}`} className="btn btn-accent">
              {t('publication.verifyCta')}
            </Link>
            <Link href={`/findings?run=${publication.run_id ?? ''}`} className="btn btn-outline">
              {t('publication.findingsCta')}
            </Link>
          </>
        }
      >
        <div className="mt-5 flex flex-wrap items-center gap-2">
          <PublicationStatusBadge status={publication.status} />
          {publication.is_synthetic && <SyntheticBadge />}
        </div>
      </PageHeader>

      <div className="container-page py-4">
        {publication.retracted_at && (
          <div className="mt-6">
            <Notice
              tone="danger"
              role="alert"
              title={t('publication.retracted', {
                date: formatDate(locale, publication.retracted_at),
              })}
            >
              {publication.retraction_reason &&
                t('publication.retractedReason', { reason: publication.retraction_reason })}
            </Notice>
          </div>
        )}
        {superseding.length > 0 && (
          <div className="mt-6">
            <Notice tone="caution" title={t('publication.superseded')}>
              <ul>
                {superseding.map((item) => (
                  <li key={item.id}>
                    <Link href={`/publications/${item.id}`}>
                      {t('publication.title', { series: item.series_id, sequence: item.sequence })}
                    </Link>
                  </li>
                ))}
              </ul>
            </Notice>
          </div>
        )}

        <Section title={t('publication.summary')} id="summary">
          <div className="card p-6">
            <DefinitionList
              items={[
                {
                  term: t('publication.manifestHash'),
                  detail: publication.manifest_hash ? (
                    <Hash value={publication.manifest_hash} />
                  ) : (
                    '—'
                  ),
                },
                {
                  term: t('publication.publishedAt'),
                  detail: formatDateTime(locale, publication.published_at),
                },
                {
                  term: t('publication.previous'),
                  detail: publication.previous_publication_id ? (
                    <Link href={`/publications/${publication.previous_publication_id}`}>
                      {t('publication.previous')}
                    </Link>
                  ) : (
                    t('publication.none')
                  ),
                },
                ...(publication.supersedes_id
                  ? [
                      {
                        term: t('publication.supersedes'),
                        detail: (
                          <Link href={`/publications/${publication.supersedes_id}`}>
                            {t('publication.supersedes')}
                          </Link>
                        ),
                      },
                    ]
                  : []),
              ]}
            />
          </div>
        </Section>

        {manifest && (
          <Section title={t('publication.datasetsTitle')} id="datasets">
            <TableWrap label={t('publication.datasetsTitle')}>
              <thead>
                <tr>
                  <th scope="col">{t('datasets.role')}</th>
                  <th scope="col">{t('datasets.rows')}</th>
                  <th scope="col">{t('datasets.root')}</th>
                </tr>
              </thead>
              <tbody>
                {manifest.datasets.map((dataset) => (
                  <tr key={dataset.version_id}>
                    <td>
                      <Link href={`/datasets/${dataset.version_id}`}>
                        {dataset.role === 'baseline'
                          ? t('datasets.roleBaseline')
                          : dataset.role === 'target'
                            ? t('datasets.roleTarget')
                            : dataset.role}
                      </Link>
                    </td>
                    <td className="tabular-nums">{formatNumber(locale, dataset.row_count)}</td>
                    <td>
                      <code className="hash">{dataset.root}</code>
                    </td>
                  </tr>
                ))}
              </tbody>
            </TableWrap>
            {manifest.audit_run && (
              <div className="card mt-5 p-6">
                <h3 className="text-lg">{t('publication.runTitle')}</h3>
                <div className="mt-3">
                  <DefinitionList
                    items={[
                      {
                        term: t('publication.methodology'),
                        detail: (
                          <Link href={`/methodology/${manifest.audit_run.methodology}`}>
                            {manifest.audit_run.methodology}
                          </Link>
                        ),
                      },
                      {
                        term: t('publication.engine'),
                        detail: <code className="hash">{manifest.audit_run.engine}</code>,
                      },
                      {
                        term: t('publication.paramsHash'),
                        detail: <Hash value={manifest.audit_run.params_hash} />,
                      },
                    ]}
                  />
                </div>
              </div>
            )}
          </Section>
        )}

        <div className="grid gap-6 lg:grid-cols-2">
          <Section
            title={t('publication.approvalsTitle')}
            id="approvals"
            description={t('publication.approvalsHelp')}
          >
            <ol className="space-y-3">
              {[...publication.publication_approvals]
                .sort((a, b) => a.created_at.localeCompare(b.created_at))
                .map((approval) => (
                  <li
                    key={approval.step}
                    className="card flex items-center justify-between gap-4 p-4"
                  >
                    <span className="font-semibold text-navy">
                      {approval.step === 'review'
                        ? t('publication.stepReview')
                        : t('publication.stepPublish')}
                    </span>
                    <span className="text-sm text-muted">
                      {t('publication.approved')} · {formatDateTime(locale, approval.created_at)}
                    </span>
                  </li>
                ))}
            </ol>
          </Section>

          <Section
            title={t('publication.anchorsTitle')}
            id="anchors"
            description={t('publication.anchorsHelp')}
          >
            {publication.blockchain_anchors.length === 0 ? (
              <p className="text-muted">{t('publication.noAnchors')}</p>
            ) : (
              <ul className="space-y-3">
                {publication.blockchain_anchors.map((anchor) => (
                  <li key={anchor.anchor_type} className="card space-y-2 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-semibold text-navy">
                        {t(`anchorType.${anchor.anchor_type}`)}
                      </span>
                      <AnchorStatusBadge status={anchor.status} />
                    </div>
                    {anchor.tx_hash && (
                      <p className="text-sm">
                        <span className="font-semibold text-muted">
                          {t('publication.transaction')}:{' '}
                        </span>
                        <a
                          href={`${chain.explorerUrl}/tx/${anchor.tx_hash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hash"
                        >
                          {anchor.tx_hash}
                          <span className="sr-only"> ({t('common.external')})</span>
                        </a>
                      </p>
                    )}
                    {anchor.block_number !== null && (
                      <p className="text-sm">
                        <span className="font-semibold text-muted">{t('publication.block')}: </span>
                        {anchor.block_number}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Section>
        </div>

        <Section
          title={t('publication.downloadsTitle')}
          id="downloads"
          description={t('publication.downloadsHelp')}
        >
          <ul className="grid gap-4 md:grid-cols-3">
            {downloads
              .filter((file) => file.path)
              .map((file) => (
                <li key={file.label} className="card flex flex-col gap-3 p-5">
                  <a
                    href={artifactUrl(supabaseUrl, file.path as string)}
                    className="font-semibold"
                    download
                  >
                    {file.label} <span aria-hidden="true">↓</span>
                  </a>
                  {file.hash && (
                    <span>
                      <span className="block text-xs font-semibold text-muted">
                        {t('common.sha256')}
                      </span>
                      <code className="hash">{file.hash}</code>
                    </span>
                  )}
                </li>
              ))}
          </ul>
        </Section>

        {manifest && (
          <Section
            title={t('publication.manifestTitle')}
            id="manifest"
            description={t('publication.manifestHelp')}
          >
            <details className="card p-5">
              <summary className="cursor-pointer font-semibold text-blue">
                {t('publication.showManifest')}
              </summary>
              <pre className="hash mt-4 overflow-x-auto whitespace-pre-wrap rounded bg-mist p-4 text-ink">
                {JSON.stringify(manifest, null, 2)}
              </pre>
            </details>
          </Section>
        )}
      </div>
    </>
  );
}
