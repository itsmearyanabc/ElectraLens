import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';

import {
  DefinitionList,
  Hash,
  Notice,
  PageHeader,
  Section,
  StatTile,
  TableWrap,
} from '@/components/ui/Page';
import { Link } from '@/i18n/navigation';
import { fetchArtifactJson, type ReportDocument } from '@/lib/data/artifacts';
import {
  getMethodologyVersion,
  getPublication,
  latestPublication,
  listMethodologyVersions,
} from '@/lib/data/public';
import { RULE_IDS, ruleName } from '@/lib/findings';
import { formatDate, formatRate } from '@/lib/format';
import { pageLocale } from '@/lib/locale';

interface MethodologyParams {
  description?: string;
  fdr_q?: string;
  min_part_electors?: number;
  signal?: Record<'strong' | 'moderate' | 'weak', { q: string; effect: string }>;
  rules?: Record<string, Record<string, string | number>>;
}

export async function generateMetadata({
  params,
}: PageProps<'/[locale]/methodology/[version]'>): Promise<Metadata> {
  const locale = await pageLocale(params);
  const { version } = await params;
  const t = await getTranslations({ locale, namespace: 'methodology' });
  return { title: t('metaTitle', { version }) };
}

export default async function MethodologyPage({
  params,
}: PageProps<'/[locale]/methodology/[version]'>) {
  const locale = await pageLocale(params);
  const { version } = await params;
  const methodology = await getMethodologyVersion(version);
  if (!methodology) notFound();
  const t = await getTranslations();
  const config = methodology.params as unknown as MethodologyParams;
  const [versions, latest] = await Promise.all([listMethodologyVersions(), latestPublication()]);
  const detail = latest ? await getPublication(latest.id) : null;
  const report = await fetchArtifactJson<ReportDocument>(detail?.report_path);
  const benchmark = report?.benchmark;

  return (
    <>
      <PageHeader
        eyebrow={t('methodology.eyebrow')}
        title={t('methodology.title', { version: methodology.version })}
        lede={t('methodology.lede')}
      >
        {versions.length > 1 && (
          <nav aria-label={t('methodology.version')} className="mt-5 flex flex-wrap gap-2">
            {versions.map((v) => (
              <Link
                key={v.version}
                href={`/methodology/${v.version}`}
                aria-current={v.version === methodology.version ? 'page' : undefined}
                className={`btn min-h-9 py-1 ${v.version === methodology.version ? 'btn-primary' : 'btn-outline'}`}
              >
                {v.version}
              </Link>
            ))}
          </nav>
        )}
      </PageHeader>

      <div className="container-page py-4">
        <Section>
          <div className="card p-6">
            <DefinitionList
              items={[
                {
                  term: t('methodology.published'),
                  detail: formatDate(locale, methodology.published_at),
                },
                {
                  term: t('methodology.paramsHash'),
                  detail: <Hash value={methodology.params_hash} />,
                },
                ...(methodology.notes
                  ? [{ term: t('methodology.notesTitle'), detail: methodology.notes }]
                  : []),
              ]}
            />
          </div>
        </Section>

        <Section title={t('methodology.rulesTitle')} id="rules">
          <TableWrap label={t('methodology.rulesTitle')}>
            <thead>
              <tr>
                <th scope="col">{t('methodology.ruleCol')}</th>
                <th scope="col">{t('methodology.checks')}</th>
                <th scope="col">{t('methodology.parameters')}</th>
                <th scope="col">{t('methodology.version')}</th>
              </tr>
            </thead>
            <tbody>
              {RULE_IDS.map((id) => {
                const rule = config.rules?.[id] ?? {};
                const parameters = Object.entries(rule).filter(([key]) => key !== 'version');
                return (
                  <tr key={id} id={id.toLowerCase()}>
                    <td className="align-top">
                      <span className="font-bold text-navy">{id}</span>
                      <span className="block text-sm">{ruleName(locale, id)}</span>
                    </td>
                    <td className="align-top">{t(`methodology.rulesAbout.${id}`)}</td>
                    <td className="align-top">
                      {parameters.length === 0 ? (
                        '—'
                      ) : (
                        <ul className="space-y-0.5">
                          {parameters.map(([key, value]) => (
                            <li key={key} className="hash">
                              {key} = {String(value)}
                            </li>
                          ))}
                        </ul>
                      )}
                    </td>
                    <td className="align-top hash">{String(rule.version ?? '—')}</td>
                  </tr>
                );
              })}
            </tbody>
          </TableWrap>
        </Section>

        <Section
          title={t('methodology.signalTitle')}
          id="signal"
          description={t('methodology.signalLede')}
        >
          {config.signal && (
            <TableWrap label={t('methodology.signalTitle')}>
              <thead>
                <tr>
                  <th scope="col">{t('methodology.level')}</th>
                  <th scope="col">{t('methodology.qMax')}</th>
                  <th scope="col">{t('methodology.effectMin')}</th>
                </tr>
              </thead>
              <tbody>
                {(['strong', 'moderate', 'weak'] as const).map((level) => (
                  <tr key={level}>
                    <th scope="row" className="!bg-white">
                      {t(`strength.${level}`)}
                    </th>
                    <td className="hash">{config.signal?.[level].q}</td>
                    <td className="hash">{config.signal?.[level].effect}×</td>
                  </tr>
                ))}
              </tbody>
            </TableWrap>
          )}
          <p className="mt-3 text-sm text-muted">{t('methodology.dataQualityRow')}</p>
        </Section>

        <Section title={t('methodology.testsTitle')} id="tests">
          <ol className="max-w-3xl list-decimal space-y-3 pl-5">
            <li>{t('methodology.test1')}</li>
            <li>{t('methodology.test2')}</li>
            <li>{t('methodology.test3', { fdr: config.fdr_q ?? '0.05' })}</li>
            <li>{t('methodology.test4')}</li>
            <li>{t('methodology.test5', { min: config.min_part_electors ?? 50 })}</li>
          </ol>
        </Section>

        <Section
          title={t('methodology.benchmarkTitle')}
          id="benchmark"
          description={t('methodology.benchmarkLede')}
        >
          {benchmark ? (
            <>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                <StatTile
                  label={t('methodology.precision')}
                  value={formatRate(locale, benchmark.overall.precision, 0)}
                />
                <StatTile
                  label={t('methodology.recall')}
                  value={formatRate(locale, benchmark.overall.recall, 0)}
                />
                <StatTile
                  accent
                  label={t('methodology.truePositives')}
                  value={benchmark.overall.true_positives}
                />
                <StatTile
                  accent
                  label={t('methodology.falsePositives')}
                  value={benchmark.overall.false_positives}
                />
                <StatTile
                  accent
                  label={t('methodology.falseNegatives')}
                  value={benchmark.overall.false_negatives}
                />
              </div>
              <div className="mt-5">
                <TableWrap label={t('methodology.benchmarkTitle')}>
                  <thead>
                    <tr>
                      <th scope="col">{t('methodology.ruleCol')}</th>
                      <th scope="col" className="text-right">
                        {t('methodology.precision')}
                      </th>
                      <th scope="col" className="text-right">
                        {t('methodology.recall')}
                      </th>
                      <th scope="col" className="text-right">
                        {t('methodology.truePositives')}
                      </th>
                      <th scope="col" className="text-right">
                        {t('methodology.falsePositives')}
                      </th>
                      <th scope="col" className="text-right">
                        {t('methodology.falseNegatives')}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(benchmark.per_rule).map(([rule, score]) => (
                      <tr key={rule}>
                        <th scope="row" className="!bg-white">
                          {rule}
                        </th>
                        <td className="text-right">{formatRate(locale, score.precision, 0)}</td>
                        <td className="text-right">{formatRate(locale, score.recall, 0)}</td>
                        <td className="text-right">{score.true_positives}</td>
                        <td className="text-right">{score.false_positives}</td>
                        <td className="text-right">{score.false_negatives}</td>
                      </tr>
                    ))}
                  </tbody>
                </TableWrap>
              </div>
            </>
          ) : (
            <p className="text-muted">{t('methodology.benchmarkEmpty')}</p>
          )}
        </Section>

        <Section title={t('methodology.limitsTitle')} id="limits">
          <Notice tone="caution">
            <ul className="list-disc space-y-1.5 pl-5">
              <li>{t('methodology.limit1')}</li>
              <li>{t('methodology.limit2')}</li>
              <li>{t('methodology.limit3')}</li>
              <li>{t('methodology.limit4')}</li>
            </ul>
          </Notice>
        </Section>
      </div>
    </>
  );
}
