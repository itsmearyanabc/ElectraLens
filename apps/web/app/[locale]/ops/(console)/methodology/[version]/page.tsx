import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';

import { OpsHeader, Panel, StatusChip } from '@/components/ops/OpsUi';
import { WorkflowForm } from '@/components/ops/WorkflowForm';
import { DefinitionList, Hash } from '@/components/ui/Page';
import { requireStaff } from '@/lib/auth';
import { pageLocale } from '@/lib/locale';
import { sessionDb } from '@/lib/supabase/server';

/** O18: a different person from the author freezes and publishes (enforced in the database). */
export default async function OpsMethodologyVersion({
  params,
}: PageProps<'/[locale]/ops/methodology/[version]'>) {
  const locale = await pageLocale(params);
  const staff = await requireStaff(locale);
  const { version } = await params;
  if (!/^[0-9]{4}\.[0-9]+$/.test(version)) notFound();
  const t = await getTranslations('ops');
  const db = await sessionDb();
  const { data: m } = await db
    .from('methodology_versions')
    .select('version, status, params, params_hash, notes')
    .eq('version', version)
    .maybeSingle();
  if (!m) notFound();
  return (
    <>
      <OpsHeader title={m.version} actions={<StatusChip status={m.status} label={m.status} />} />
      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Panel>
          <DefinitionList
            items={[
              { term: t('methodology.paramsHash'), detail: <Hash value={m.params_hash} /> },
              { term: t('methodology.notes'), detail: m.notes ?? '—' },
            ]}
          />
          <pre className="hash mt-5 max-h-[28rem] overflow-auto rounded-xl bg-mist p-4 whitespace-pre-wrap">
            {JSON.stringify(m.params, null, 2)}
          </pre>
        </Panel>
        {staff.has('publisher') && m.status !== 'published' && (
          <Panel title={m.status === 'draft' ? t('methodology.freeze') : t('methodology.publish')}>
            <p className="mb-4 text-sm text-muted">{t('methodology.frozenNote')}</p>
            <WorkflowForm
              op={m.status === 'draft' ? 'freeze_methodology' : 'publish_methodology'}
              fields={{ id: m.version }}
              submitLabel={
                m.status === 'draft' ? t('methodology.freeze') : t('methodology.publish')
              }
              tone="blue"
            />
          </Panel>
        )}
      </div>
    </>
  );
}
