import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { AreaPicker } from '@/components/charts/AreaPicker';
import { BarList } from '@/components/charts/BarList';
import { LevelBadge } from '@/components/charts/LevelBadge';
import { AiExplanation } from '@/components/findings/AiExplanation';
import { SyntheticBadge } from '@/components/ui/Badge';
import { EmptyState, Notice, PageHeader, Section, StatTile, TableWrap } from '@/components/ui/Page';
import { Link } from '@/i18n/navigation';
import { compareArea } from '@/lib/areaStats';
import {
  areaPath,
  areaTree,
  getArea,
  getPublication,
  isUuid,
  latestPublication,
} from '@/lib/data/public';
import { localName } from '@/lib/data/types';
import { formatNumber, formatRate, formatSigned } from '@/lib/format';
import { pageLocale } from '@/lib/locale';
import { one } from '@/lib/params';

import { explainAreaAction } from './actions';

export async function generateMetadata({
  params,
}: PageProps<'/[locale]/compare'>): Promise<Metadata> {
  const locale = await pageLocale(params);
  const t = await getTranslations({ locale, namespace: 'compare' });
  return { title: t('metaTitle') };
}

const HEADLINES = [
  'electors_baseline',
  'electors_target',
  'additions',
  'deletions',
  'corrections',
] as const;
const REASONS = ['D', 'S', 'A', 'R', 'unrecorded', 'unspecified'] as const;
const GENDERS = ['F', 'M', 'T'] as const;
const BANDS = ['18-19', '20-29', '30-39', '40-49', '50-59', '60-69', '70-79', '80-150'] as const;

export default async function ComparePage({
  params,
  searchParams,
}: PageProps<'/[locale]/compare'>) {
  const locale = await pageLocale(params);
  const t = await getTranslations();
  const query = await searchParams;
  const requestedPublication = one(query, 'publication');
  const publication =
    requestedPublication && isUuid(requestedPublication)
      ? await getPublication(requestedPublication)
      : await latestPublication();

  if (!publication) {
    return (
      <>
        <PageHeader eyebrow={t('compare.eyebrow')} title={t('compare.metaTitle')} />
        <div className="container-page py-8">
          <EmptyState title={t('compare.empty')} />
        </div>
      </>
    );
  }

  const requestedArea = one(query, 'area')?.toUpperCase();
  const area =
    (requestedArea ? await getArea(requestedArea) : null) ?? (await getArea(publication.series_id));
  if (!area) {
    return (
      <div className="container-page py-8">
        <EmptyState title={t('compare.empty')} />
      </div>
    );
  }
  const [comparison, path] = await Promise.all([compareArea(publication.id, area), areaPath(area)]);
  const { table } = comparison;
  const children = comparison.children.map((row) => row.area);
  const tree = path[0] ? await areaTree(path[0].id) : [];
  const levelLabels = {
    normal: t('compare.levels.normal'),
    unusual: t('compare.levels.unusual'),
    highly_unusual: t('compare.levels.highly_unusual'),
    none: t('compare.levels.none'),
    higher: t('compare.levels.higher'),
    lower: t('compare.levels.lower'),
  };
  const percent = (value: number) => formatRate(locale, value / 100);
  const fmt = (value: number) => formatNumber(locale, value);
  const childLevel = children[0]?.level;
  const keep = {
    publication:
      requestedPublication && isUuid(requestedPublication) ? requestedPublication : undefined,
  };
  const areaHref = (code: string) => ({
    pathname: '/compare',
    query: { area: code, ...(keep.publication ? keep : {}) },
  });
  // A missing cell is zero; a suppressed one stays null and is shown as "< 10".
  const breakdown = (metric: string, dim: string, keys: readonly string[]) =>
    keys.map((key) => {
      const cell = table.get(area.id, metric, { [dim]: key });
      return cell ? cell.value : 0;
    });
  const reasons = breakdown('deletions_by_reason', 'reason', REASONS);
  const genders = breakdown('electors_target_by_gender', 'gender', GENDERS);
  const bands = breakdown('electors_target_by_age_band', 'band', BANDS);

  return (
    <>
      <PageHeader
        eyebrow={t('compare.eyebrow')}
        title={t('compare.title', { area: localName(area.name, locale) })}
        lede={t('compare.lede', { series: publication.series_id, sequence: publication.sequence })}
      >
        <nav aria-label={t('compare.breadcrumb')} className="mt-5">
          <ol className="flex flex-wrap items-center gap-1 text-sm">
            {path.map((step, index) => (
              <li key={step.id} className="flex items-center gap-1">
                {index > 0 && (
                  <span aria-hidden="true" className="text-muted">
                    ›
                  </span>
                )}
                {step.id === area.id ? (
                  <span
                    aria-current="page"
                    className="rounded-md bg-navy px-2 py-0.5 font-semibold text-white"
                  >
                    {localName(step.name, locale)}
                  </span>
                ) : (
                  <Link href={areaHref(step.code)} className="rounded-md px-2 py-0.5 font-semibold">
                    {localName(step.name, locale)}
                  </Link>
                )}
              </li>
            ))}
            {publication.is_synthetic && (
              <li className="ml-2">
                <SyntheticBadge />
              </li>
            )}
          </ol>
        </nav>
      </PageHeader>

      <div className="container-page py-4">
        <div className="card mb-6 p-5">
          <AreaPicker
            options={tree.map(({ area: option, depth }) => ({
              code: option.code,
              label: `${localName(option.name, locale)} · ${t(`level.${option.level}`)}`,
              depth,
            }))}
            current={area.code}
            publication={keep.publication}
            label={t('compare.picker')}
            submit={t('compare.pickerSubmit')}
          />
        </div>

        <Section title={t('compare.overview')} id="overview">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
            {HEADLINES.map((metric, index) => {
              const cell = table.get(area.id, metric);
              return (
                <StatTile
                  key={metric}
                  accent={index >= 2}
                  label={t(`metric.${metric}`)}
                  value={cell ? (cell.value === null ? '< 10' : fmt(cell.value)) : '—'}
                />
              );
            })}
            <StatTile
              accent
              label={t('metric.net_change')}
              value={formatSigned(locale, table.value(area.id, 'net_change') ?? 0)}
            />
          </div>
          <p className="mt-4 text-sm text-muted">{t('common.suppressedNote')}</p>
          <p className="mt-2">
            <Link
              href={{ pathname: '/findings', query: { area: area.code } }}
              className="font-semibold"
            >
              {t('compare.seeFindings')} →
            </Link>
          </p>
        </Section>

        <Section
          title={t('compare.levelTitle')}
          id="levels"
          description={
            comparison.parent
              ? t('compare.levelHelp', {
                  count: comparison.peerCount - 1,
                  parent: localName(comparison.parent.name, locale),
                })
              : t('compare.levelHelpTop', { area: localName(area.name, locale) })
          }
        >
          <div className="grid gap-4 sm:grid-cols-2">
            {(
              [
                ['additions', comparison.self.additionRate, comparison.self.additionLevel],
                ['deletions', comparison.self.deletionRate, comparison.self.deletionLevel],
              ] as const
            ).map(([metric, rate, level]) => (
              <div key={metric} className="card p-5">
                <p className="mono-label">{t(`compare.rateOf.${metric}`)}</p>
                <p className="display mt-2 text-3xl">
                  {rate === null ? '—' : formatRate(locale, rate)}
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-muted">
                  <LevelBadge level={level} labels={levelLabels} />
                  {level && (
                    <span>
                      {t('compare.peerMedian', { rate: formatRate(locale, level.peerMedian) })}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-6">
            <AiExplanation
              explain={explainAreaAction.bind(null, publication.id, area.code, locale)}
              text={{
                title: t('compare.ai.title'),
                intro: t('compare.ai.intro'),
                button: t('finding.ai.button'),
                working: t('finding.ai.working'),
                badge: t('finding.ai.badge'),
                disclaimer: t('finding.ai.disclaimer'),
                unavailable: t('finding.ai.unavailable'),
                refused: t('finding.ai.refused'),
              }}
            />
          </div>
        </Section>

        {children.length > 0 && childLevel ? (
          <Section
            title={t('compare.byChild', { level: t(`level.${childLevel}`) })}
            id="children"
            description={t('compare.chooseArea', { area: localName(area.name, locale) })}
          >
            <BarList
              id="by-child"
              title={t('compare.additionsVsDeletions', { level: t(`level.${childLevel}`) })}
              series={[
                { key: 'additions', label: t('metric.additions'), tone: 'saffron' },
                { key: 'deletions', label: t('metric.deletions'), tone: 'blue' },
              ]}
              rows={children.map((child) => ({
                key: child.id,
                label: localName(child.name, locale),
                values: [table.value(child.id, 'additions'), table.value(child.id, 'deletions')],
              }))}
              format={fmt}
              suppressedLabel={t('common.suppressed')}
              tableLabel={t('common.tableOfChart')}
            />
            <div className="mt-6">
              <BarList
                id="rates-by-child"
                title={t('compare.ratesChart', { level: t(`level.${childLevel}`) })}
                description={t('compare.ratesHelp')}
                series={[
                  { key: 'additions', label: t('compare.rateOf.additions'), tone: 'saffron' },
                  { key: 'deletions', label: t('compare.rateOf.deletions'), tone: 'blue' },
                ]}
                rows={comparison.children.map((row) => ({
                  key: row.area.id,
                  label: localName(row.area.name, locale),
                  values: [
                    row.additionRate === null ? null : row.additionRate * 100,
                    row.deletionRate === null ? null : row.deletionRate * 100,
                  ],
                }))}
                format={percent}
                suppressedLabel={t('common.suppressed')}
                tableLabel={t('common.tableOfChart')}
              />
            </div>
            <div className="mt-6">
              <TableWrap label={t('compare.byChild', { level: t(`level.${childLevel}`) })}>
                <thead>
                  <tr>
                    <th scope="col">{t(`level.${childLevel}`)}</th>
                    <th scope="col" className="text-right">
                      {t('metric.electors_baseline')}
                    </th>
                    <th scope="col" className="text-right">
                      {t('metric.electors_target')}
                    </th>
                    <th scope="col" className="text-right">
                      {t('metric.additions')}
                    </th>
                    <th scope="col" className="text-right">
                      {t('metric.deletions')}
                    </th>
                    <th scope="col" className="text-right">
                      {t('compare.net')}
                    </th>
                    <th scope="col" className="text-right">
                      {t('compare.deletionRate')}
                    </th>
                    <th scope="col">{t('compare.additionLevel')}</th>
                    <th scope="col">{t('compare.deletionLevel')}</th>
                  </tr>
                </thead>
                <tbody>
                  {comparison.children.map(({ area: child, additionLevel, deletionLevel }) => {
                    const cells = (
                      ['electors_baseline', 'electors_target', 'additions', 'deletions'] as const
                    ).map((metric) => table.get(child.id, metric));
                    const baseline = cells[0]?.value;
                    const deletions = cells[3]?.value;
                    return (
                      <tr key={child.id}>
                        <th scope="row" className="!bg-white">
                          <Link href={areaHref(child.code)}>{localName(child.name, locale)}</Link>
                        </th>
                        {cells.map((cell, index) => (
                          <td key={index} className="text-right tabular-nums">
                            {!cell ? (
                              '—'
                            ) : cell.value === null ? (
                              <abbr title={t('common.suppressed')}>{'< 10'}</abbr>
                            ) : (
                              fmt(cell.value)
                            )}
                          </td>
                        ))}
                        <td className="text-right tabular-nums">
                          {formatSigned(locale, table.value(child.id, 'net_change') ?? 0)}
                        </td>
                        <td className="text-right tabular-nums">
                          {baseline && deletions !== null && deletions !== undefined
                            ? formatRate(locale, deletions / baseline)
                            : '—'}
                        </td>
                        <td>
                          <LevelBadge level={additionLevel} labels={levelLabels} />
                        </td>
                        <td>
                          <LevelBadge level={deletionLevel} labels={levelLabels} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </TableWrap>
            </div>
          </Section>
        ) : (
          <Section>
            <Notice>{t('compare.noChildren')}</Notice>
          </Section>
        )}

        <div className="grid gap-6 pb-4 lg:grid-cols-2">
          <BarList
            id="reasons"
            title={t('compare.deletionReasons')}
            description={t('compare.deletionReasonsHelp')}
            series={[{ key: 'deletions', label: t('metric.deletions'), tone: 'blue' }]}
            rows={REASONS.map((reason, index) => ({
              key: reason,
              label: t(`compare.reason.${reason}`),
              values: [reasons[index] ?? null],
            }))}
            format={fmt}
            suppressedLabel={t('common.suppressed')}
            tableLabel={t('common.tableOfChart')}
          />
          <BarList
            id="gender"
            title={t('compare.gender')}
            series={[{ key: 'electors', label: t('metric.electors_target'), tone: 'navy' }]}
            rows={GENDERS.map((gender, index) => ({
              key: gender,
              label: t(`gender.${gender}`),
              values: [genders[index] ?? null],
            }))}
            format={fmt}
            suppressedLabel={t('common.suppressed')}
            tableLabel={t('common.tableOfChart')}
          />
          <div className="lg:col-span-2">
            <BarList
              id="age"
              title={t('compare.age')}
              series={[{ key: 'electors', label: t('metric.electors_target'), tone: 'saffron' }]}
              rows={BANDS.map((band, index) => ({
                key: band,
                label: t('compare.band', {
                  band: band === '80-150' ? '80+' : band.replace('-', '–'),
                }),
                values: [bands[index] ?? null],
              }))}
              format={fmt}
              suppressedLabel={t('common.suppressed')}
              tableLabel={t('common.tableOfChart')}
            />
          </div>
        </div>
      </div>
    </>
  );
}
