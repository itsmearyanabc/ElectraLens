import { getTranslations } from 'next-intl/server';

import { OpsHeader, OpsTable, Panel, StatusChip } from '@/components/ops/OpsUi';
import { WorkflowForm } from '@/components/ops/WorkflowForm';
import { Link } from '@/i18n/navigation';
import { requireStaff } from '@/lib/auth';
import { formatDate } from '@/lib/format';
import { pageLocale } from '@/lib/locale';
import { sessionDb } from '@/lib/supabase/server';

/** O17 / B15.12 */
export default async function OpsMethodology({ params }: PageProps<'/[locale]/ops/methodology'>) {
  const locale = await pageLocale(params);
  const staff = await requireStaff(locale);
  const t = await getTranslations();
  const db = await sessionDb();
  const { data } = await db
    .from('methodology_versions')
    .select('version, status, created_at')
    .order('version', { ascending: false });
  const rows = data ?? [];
  return (
    <>
      <OpsHeader title={t('ops.methodology.title')} lede={t('ops.methodology.frozenNote')} />
      <OpsTable
        head={[t('ops.c.version'), t('ops.c.status'), t('ops.c.created')]}
        empty={rows.length === 0 ? t('ops.c.empty') : null}
      >
        {rows.map((m) => (
          <tr key={m.version}>
            <td>
              <Link href={`/ops/methodology/${m.version}`} className="font-mono font-bold">
                {m.version}
              </Link>
            </td>
            <td>
              <StatusChip status={m.status} label={m.status} />
            </td>
            <td>{formatDate(locale, m.created_at)}</td>
          </tr>
        ))}
      </OpsTable>
      {staff.has('analyst') && (
        <Panel title={t('ops.methodology.draft')} className="mt-8">
          <WorkflowForm op="create_methodology" submitLabel={t('ops.methodology.createDraft')}>
            <div className="grid gap-4 sm:grid-cols-[12rem_1fr]">
              <div>
                <label className="label" htmlFor="version">
                  {t('ops.c.version')}
                </label>
                <input
                  id="version"
                  name="version"
                  placeholder="2027.1"
                  pattern="[0-9]{4}\.[0-9]+"
                  required
                  className="field font-mono"
                />
              </div>
              <div>
                <label className="label" htmlFor="notes">
                  {t('ops.methodology.notes')}
                </label>
                <input id="notes" name="notes" className="field" />
              </div>
            </div>
            <div>
              <label className="label" htmlFor="params">
                {t('ops.methodology.params')}
              </label>
              <textarea
                id="params"
                name="params"
                rows={10}
                required
                className="field font-mono text-sm"
                defaultValue="{}"
              />
            </div>
          </WorkflowForm>
        </Panel>
      )}
    </>
  );
}
