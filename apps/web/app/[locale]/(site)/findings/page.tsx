import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { LabelBadge, ReviewBadge, SignalBadge } from '@/components/ui/Badge';
import { EmptyState, Notice, PageHeader } from '@/components/ui/Page';
import { Pagination } from '@/components/ui/Pagination';
import { Link } from '@/i18n/navigation';
import { fetchArtifactJson, type ReportDocument } from '@/lib/data/artifacts';
import { areaLabels } from '@/lib/areas';
import {
  FINDINGS_PAGE_SIZE,
  getPublication,
  latestPublication,
  listFindings,
} from '@/lib/data/public';
import { explanationText, parseFinding, RULE_IDS, ruleName } from '@/lib/findings';
import { pageLocale } from '@/lib/locale';
import { one, oneOf, pageNumber } from '@/lib/params';

const STRENGTHS = ['strong', 'moderate', 'data_quality'] as const;
const REVIEWS = ['accepted', 'downgraded'] as const;

export async function generateMetadata({
  params,
}: PageProps<'/[locale]/findings'>): Promise<Metadata> {
  const locale = await pageLocale(params);
  const t = await getTranslations({ locale, namespace: 'findings' });
  return { title: t('metaTitle') };
}

export default async function FindingsPage({
  params,
  searchParams,
}: PageProps<'/[locale]/findings'>) {
  const locale = await pageLocale(params);
  const t = await getTranslations();
  const query = await searchParams;
  const filters = {
    rule: oneOf(query, 'rule', RULE_IDS),
    strength: oneOf(query, 'strength', STRENGTHS),
    review: oneOf(query, 'review', REVIEWS),
    area: one(query, 'area')?.toUpperCase(),
    page: pageNumber(query),
  };
  const [{ rows, total }, latest] = await Promise.all([listFindings(filters), latestPublication()]);
  const areas = await areaLabels(
    rows.map((row) => row.jurisdiction_id),
    locale,
  );
  const detail = latest ? await getPublication(latest.id) : null;
  const report = await fetchArtifactJson<ReportDocument>(detail?.report_path);
  const pages = Math.max(1, Math.ceil(total / FINDINGS_PAGE_SIZE));

  return (
    <>
      <PageHeader
        eyebrow={t('findings.eyebrow')}
        title={t('findings.title')}
        lede={t('findings.lede')}
      />
      <div className="container-page grid gap-8 py-8 lg:grid-cols-[17rem_1fr]">
        <aside>
          <form
            method="get"
            className="card space-y-4 p-5 lg:sticky lg:top-4"
            aria-labelledby="filters-title"
          >
            <h2 id="filters-title" className="text-lg">
              {t('findings.filters')}
            </h2>
            <div>
              <label htmlFor="f-rule" className="label">
                {t('findings.rule')}
              </label>
              <select id="f-rule" name="rule" defaultValue={filters.rule ?? ''} className="field">
                <option value="">{t('common.any')}</option>
                {RULE_IDS.map((id) => (
                  <option key={id} value={id}>
                    {id} · {ruleName(locale, id)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="f-strength" className="label">
                {t('findings.strength')}
              </label>
              <select
                id="f-strength"
                name="strength"
                defaultValue={filters.strength ?? ''}
                className="field"
              >
                <option value="">{t('common.any')}</option>
                {STRENGTHS.map((s) => (
                  <option key={s} value={s}>
                    {t(`strength.${s}`)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="f-review" className="label">
                {t('findings.review')}
              </label>
              <select
                id="f-review"
                name="review"
                defaultValue={filters.review ?? ''}
                className="field"
              >
                <option value="">{t('common.any')}</option>
                {REVIEWS.map((r) => (
                  <option key={r} value={r}>
                    {t(`review.${r}`)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="f-area" className="label">
                {t('findings.area')}
              </label>
              <input
                id="f-area"
                name="area"
                defaultValue={filters.area ?? ''}
                placeholder={t('findings.areaPlaceholder')}
                className="field"
                autoComplete="off"
                spellCheck={false}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="submit" className="btn btn-primary">
                {t('common.apply')}
              </button>
              <Link href="/findings" className="btn btn-outline">
                {t('common.clearFilters')}
              </Link>
            </div>
          </form>
        </aside>

        <div>
          <div className="space-y-3">
            <Notice tone="caution">{t('findings.notProof')}</Notice>
            {report && (
              <p className="text-muted">
                {t('findings.reviewedCounts', {
                  total: report.findings_total,
                  accepted: report.review_counts.accepted,
                  downgraded: report.review_counts.downgraded,
                  rejected: report.review_counts.rejected,
                  weak: report.weak_findings_not_published,
                })}
              </p>
            )}
          </div>

          <p className="mt-6 font-semibold text-navy" role="status">
            {t('findings.results', { count: total })}
          </p>

          {rows.length === 0 ? (
            <div className="mt-4">
              <EmptyState title={t('findings.empty')} />
            </div>
          ) : (
            <ul className="mt-4 space-y-4">
              {rows.map((row) => {
                const finding = parseFinding(row.finding);
                const area = areas.get(row.jurisdiction_id);
                return (
                  <li key={row.id}>
                    <article className="card p-5 transition-colors hover:border-blue">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-sm font-semibold text-muted">
                          {row.finding_code}
                        </span>
                        <SignalBadge strength={row.signal_strength} />
                        <ReviewBadge status={row.review_status} />
                        <LabelBadge label={row.label} />
                      </div>
                      <h2 className="mt-3 text-lg">
                        <Link
                          href={`/findings/${row.id}`}
                          className="text-navy no-underline hover:underline"
                          aria-label={t('findings.open', { code: row.finding_code })}
                        >
                          {row.rule_id} · {ruleName(locale, row.rule_id)}
                        </Link>
                      </h2>
                      {area && (
                        <p className="text-sm font-semibold text-orange-ink">
                          {t('finding.inArea', { area: area.label })} · {area.code}
                        </p>
                      )}
                      {finding && (
                        <p className="mt-2 line-clamp-3 text-muted">
                          {explanationText(finding, locale)}
                        </p>
                      )}
                    </article>
                  </li>
                );
              })}
            </ul>
          )}

          <Pagination
            pathname="/findings"
            query={{
              rule: filters.rule,
              strength: filters.strength,
              review: filters.review,
              area: filters.area,
            }}
            page={filters.page}
            pages={pages}
          />
        </div>
      </div>
    </>
  );
}
