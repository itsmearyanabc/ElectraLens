import { getTranslations } from 'next-intl/server';

import { OpsHeader, Panel } from '@/components/ops/OpsUi';
import { WorkflowForm } from '@/components/ops/WorkflowForm';
import { Notice } from '@/components/ui/Page';
import { requireStaff } from '@/lib/auth';
import { formatDateTime } from '@/lib/format';
import { pageLocale } from '@/lib/locale';
import { sessionDb } from '@/lib/supabase/server';

/** O13: create_publication requires a reviewed run and queues publish_prepare. */
export default async function NewPublication({
  params,
}: PageProps<'/[locale]/ops/publications/new'>) {
  const locale = await pageLocale(params);
  await requireStaff(locale);
  const t = await getTranslations('ops');
  const db = await sessionDb();
  const { data } = await db
    .from('audit_runs')
    .select('id, methodology_version, finished_at')
    .eq('status', 'ready_for_review')
    .order('finished_at', { ascending: false });
  const runs = data ?? [];
  return (
    <>
      <OpsHeader title={t('publications.new')} lede={t('publications.createNote')} />
      {runs.length === 0 ? (
        <Notice tone="caution">{t('publications.noRuns')}</Notice>
      ) : (
        <Panel>
          <WorkflowForm op="create_publication" submitLabel={t('publications.create')}>
            <label className="label" htmlFor="run">
              {t('publications.fromRun')}
            </label>
            <select id="run" name="run" className="field">
              {runs.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.id.slice(0, 8)} · {r.methodology_version} ·{' '}
                  {formatDateTime(locale, r.finished_at)}
                </option>
              ))}
            </select>
          </WorkflowForm>
        </Panel>
      )}
    </>
  );
}
