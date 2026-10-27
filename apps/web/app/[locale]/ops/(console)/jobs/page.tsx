import { getTranslations } from 'next-intl/server';

import { OpsHeader, OpsTable, StatusChip } from '@/components/ops/OpsUi';
import { WorkflowForm } from '@/components/ops/WorkflowForm';
import { requireStaff } from '@/lib/auth';
import { formatDateTime } from '@/lib/format';
import { pageLocale } from '@/lib/locale';
import { sessionDb } from '@/lib/supabase/server';

/** O23 / B15.10: retrying a job goes through the API (staff/jobs/{id}/retry). */
export default async function OpsJobs({ params }: PageProps<'/[locale]/ops/jobs'>) {
  const locale = await pageLocale(params);
  await requireStaff(locale);
  const t = await getTranslations();
  const db = await sessionDb();
  const { data } = await db
    .from('jobs')
    .select('id, kind, status, attempts, max_attempts, last_error, created_at')
    .order('created_at', { ascending: false })
    .limit(200);
  const rows = data ?? [];
  return (
    <>
      <OpsHeader title={t('ops.jobs.title')} />
      <OpsTable
        head={[
          t('ops.jobs.kind'),
          t('ops.c.status'),
          t('ops.jobs.attempts'),
          t('ops.jobs.lastError'),
          t('ops.c.created'),
        ]}
        empty={rows.length === 0 ? t('ops.c.empty') : null}
      >
        {rows.map((j) => (
          <tr key={j.id}>
            <td className="font-mono text-sm">{j.kind}</td>
            <td>
              <StatusChip status={j.status} label={t(`jobStatus.${j.status}`)} />
            </td>
            <td className="tabular-nums">
              {j.attempts} / {j.max_attempts}
            </td>
            <td className="max-w-xs truncate text-sm text-muted">{j.last_error ?? ''}</td>
            <td className="whitespace-nowrap">{formatDateTime(locale, j.created_at)}</td>
            <td>
              {(j.status === 'failed' || j.status === 'dead') && (
                <WorkflowForm
                  op="retry_job"
                  fields={{ id: j.id }}
                  submitLabel={t('ops.jobs.retry')}
                  tone="outline"
                />
              )}
            </td>
          </tr>
        ))}
      </OpsTable>
    </>
  );
}
