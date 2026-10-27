import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';

import { OpsHeader, OpsTable, Panel, StatusChip } from '@/components/ops/OpsUi';
import { DefinitionList, Hash } from '@/components/ui/Page';
import { Link } from '@/i18n/navigation';
import { requireStaff } from '@/lib/auth';
import { isUuid } from '@/lib/data/public';
import { ruleName } from '@/lib/findings';
import { formatDateTime } from '@/lib/format';
import { pageLocale } from '@/lib/locale';
import { sessionDb } from '@/lib/supabase/server';

/** O09 */
export default async function OpsRun({ params }: PageProps<'/[locale]/ops/runs/[id]'>) {
  const locale = await pageLocale(params);
  await requireStaff(locale);
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const t = await getTranslations();
  const db = await sessionDb();
  const [{ data: run }, { data: findings }] = await Promise.all([
    db
      .from('audit_runs')
      .select(
        'id, status, methodology_version, engine_version, output_hash, error, created_at, finished_at',
      )
      .eq('id', id)
      .maybeSingle(),
    db
      .from('anomaly_findings')
      .select('id, finding_code, rule_id, signal_strength, review_status')
      .eq('run_id', id)
      .order('finding_code'),
  ]);
  if (!run) notFound();
  const list = findings ?? [];
  return (
    <>
      <OpsHeader
        title={`${t('ops.runs.title')} ${run.id.slice(0, 8)}`}
        actions={<StatusChip status={run.status} label={t(`runStatus.${run.status}`)} />}
      />
      <Panel>
        <DefinitionList
          items={[
            { term: t('ops.runs.methodology'), detail: run.methodology_version },
            {
              term: t('ops.runs.engine'),
              detail: <code className="hash">{run.engine_version ?? '—'}</code>,
            },
            {
              term: t('ops.runs.output'),
              detail: run.output_hash ? <Hash value={run.output_hash} /> : '—',
            },
            { term: t('ops.c.created'), detail: formatDateTime(locale, run.created_at) },
            ...(run.error ? [{ term: t('ops.runs.error'), detail: run.error }] : []),
          ]}
        />
      </Panel>
      <h2 className="mt-10 mb-4 text-[1.75rem]">{t('ops.runs.findings')}</h2>
      <OpsTable
        head={['Code', t('ops.c.kind'), t('ops.c.status')]}
        empty={list.length === 0 ? t('ops.c.empty') : null}
      >
        {list.map((f) => (
          <tr key={f.id}>
            <td>
              <Link href={`/ops/findings/${f.id}`} className="font-mono font-bold">
                {f.finding_code}
              </Link>
            </td>
            <td>
              {f.rule_id} · {ruleName(locale, f.rule_id)} · {t(`strength.${f.signal_strength}`)}
            </td>
            <td>
              <StatusChip status={f.review_status} label={t(`review.${f.review_status}`)} />
            </td>
          </tr>
        ))}
      </OpsTable>
    </>
  );
}
