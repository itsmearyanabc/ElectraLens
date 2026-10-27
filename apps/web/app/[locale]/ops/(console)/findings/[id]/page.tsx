import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';

import { OpsHeader, Panel, StatusChip } from '@/components/ops/OpsUi';
import { WorkflowForm } from '@/components/ops/WorkflowForm';
import { requireStaff } from '@/lib/auth';
import { openEvidence } from '../../../upload-actions';
import { isUuid } from '@/lib/data/public';
import { evidenceRows } from '@/lib/evidence';
import { catalogueText, explanationText, parseFinding, ruleName } from '@/lib/findings';
import { pageLocale } from '@/lib/locale';
import { sessionDb } from '@/lib/supabase/server';

/** O11: the reviewer sees weak findings too; review_finding blocks the run's own creator. */
export default async function OpsFinding({ params }: PageProps<'/[locale]/ops/findings/[id]'>) {
  const locale = await pageLocale(params);
  const staff = await requireStaff(locale);
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const t = await getTranslations();
  const db = await sessionDb();
  const { data: row } = await db
    .from('anomaly_findings')
    .select('id, finding_code, rule_id, signal_strength, review_status, finding')
    .eq('id', id)
    .maybeSingle();
  if (!row) notFound();
  const finding = parseFinding(row.finding);
  return (
    <>
      <OpsHeader
        title={`${row.finding_code} · ${ruleName(locale, row.rule_id)}`}
        actions={<StatusChip status={row.review_status} label={t(`review.${row.review_status}`)} />}
      />
      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-6">
          {finding && (
            <Panel>
              <p className="text-lg">{explanationText(finding, locale)}</p>
              <dl className="mt-5 grid grid-cols-[1fr_auto] gap-x-6 gap-y-2 text-sm">
                {evidenceRows(finding.evidence, locale).map((item) => (
                  <div key={item.key} className="contents">
                    <dt className="text-muted">
                      {t.has(`evidence.${item.key}`) ? t(`evidence.${item.key}`) : item.key}
                    </dt>
                    <dd className="text-right font-semibold tabular-nums">{item.value}</dd>
                  </div>
                ))}
              </dl>
              <ul className="mt-5 list-disc space-y-1 pl-5 text-sm text-muted">
                {finding.alternative_explanations.map((key) => (
                  <li key={key}>{catalogueText(locale, key)}</li>
                ))}
              </ul>
            </Panel>
          )}
          <Panel title={t('ops.findings.evidence')}>
            <p className="mb-4 text-sm text-muted">{t('ops.findings.evidenceNote')}</p>
            <form action={openEvidence}>
              <input type="hidden" name="id" value={row.id} />
              <button type="submit" className="btn btn-outline">
                {t('ops.findings.openEvidence')}
              </button>
            </form>
          </Panel>
        </div>
        {staff.has('reviewer') && (
          <Panel title={t('ops.findings.review')}>
            <WorkflowForm
              op="review_finding"
              fields={{ id: row.id }}
              submitLabel={t('ops.c.submit')}
              reason
            >
              <fieldset>
                <legend className="label">{t('ops.findings.decision')}</legend>
                <div className="mt-1 space-y-2">
                  {(['accepted', 'downgraded', 'rejected'] as const).map((d, i) => (
                    <label key={d} className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="decision"
                        value={d}
                        defaultChecked={i === 0}
                        className="accent-[#2864dc]"
                      />
                      {t(`ops.findings.decisions.${d}`)}
                    </label>
                  ))}
                </div>
              </fieldset>
            </WorkflowForm>
          </Panel>
        )}
      </div>
    </>
  );
}
