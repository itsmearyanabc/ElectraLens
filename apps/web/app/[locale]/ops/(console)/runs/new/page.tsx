import { getTranslations } from 'next-intl/server';

import { OpsHeader, Panel } from '@/components/ops/OpsUi';
import { WorkflowForm } from '@/components/ops/WorkflowForm';
import { Notice } from '@/components/ui/Page';
import { requireStaff } from '@/lib/auth';
import { pageLocale } from '@/lib/locale';
import { sessionDb } from '@/lib/supabase/server';

/** O08: request_audit_run checks both versions are approved, same area, and the methodology frozen. */
export default async function NewRun({ params }: PageProps<'/[locale]/ops/runs/new'>) {
  const locale = await pageLocale(params);
  await requireStaff(locale);
  const t = await getTranslations('ops');
  const db = await sessionDb();
  const [{ data: versions }, { data: methods }] = await Promise.all([
    db
      .from('dataset_versions')
      .select('id, label')
      .eq('status', 'approved')
      .eq('kind', 'electoral_roll')
      .order('qualifying_date'),
    db
      .from('methodology_versions')
      .select('version, status')
      .in('status', ['frozen', 'published'])
      .order('version', { ascending: false }),
  ]);
  const options = versions ?? [];
  return (
    <>
      <OpsHeader title={t('runs.new')} />
      {options.length < 2 ? (
        <Notice tone="caution">{t('runs.noApproved')}</Notice>
      ) : (
        <Panel>
          <WorkflowForm op="request_run" submitLabel={t('runs.start')}>
            <div className="grid gap-4 sm:grid-cols-3">
              {(['baseline', 'target'] as const).map((field, index) => (
                <div key={field}>
                  <label className="label" htmlFor={field}>
                    {t(`runs.${field}`)}
                  </label>
                  <select
                    id={field}
                    name={field}
                    className="field"
                    defaultValue={options[index]?.id}
                  >
                    {options.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.label}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
              <div>
                <label className="label" htmlFor="methodology">
                  {t('runs.methodology')}
                </label>
                <select id="methodology" name="methodology" className="field">
                  {(methods ?? []).map((m) => (
                    <option key={m.version} value={m.version}>
                      {m.version}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </WorkflowForm>
        </Panel>
      )}
    </>
  );
}
