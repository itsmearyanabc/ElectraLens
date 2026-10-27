import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';

import { OpsHeader, Panel, StatusChip } from '@/components/ops/OpsUi';
import { WorkflowForm } from '@/components/ops/WorkflowForm';
import { DefinitionList, Hash } from '@/components/ui/Page';
import { requireStaff } from '@/lib/auth';
import { isUuid } from '@/lib/data/public';
import { formatDateTime } from '@/lib/format';
import { pageLocale } from '@/lib/locale';
import { sessionDb } from '@/lib/supabase/server';

/** O14: approvals bind to the exact manifest hash shown here; the database rejects a stale one. */
export default async function OpsPublication({
  params,
}: PageProps<'/[locale]/ops/publications/[id]'>) {
  const locale = await pageLocale(params);
  const staff = await requireStaff(locale);
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const t = await getTranslations();
  const db = await sessionDb();
  const { data: p } = await db
    .from('publications')
    .select(
      'id, series_id, sequence, status, manifest, manifest_hash, created_at, publication_approvals(step, decision, created_at)',
    )
    .eq('id', id)
    .maybeSingle();
  if (!p) notFound();
  const approvals = p.publication_approvals ?? [];
  const reviewed = approvals.some((a) => a.step === 'review' && a.decision === 'approve');
  const canApproveReview = staff.has('reviewer') && p.status === 'in_review' && !reviewed;
  const canApprovePublish = staff.has('publisher') && p.status === 'in_review' && reviewed;

  return (
    <>
      <OpsHeader
        title={`${p.series_id} · ${p.sequence}`}
        actions={<StatusChip status={p.status} label={t(`pubStatus.${p.status}`)} />}
      />
      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-6">
          <Panel>
            <DefinitionList
              items={[
                {
                  term: t('ops.publications.manifestHash'),
                  detail: p.manifest_hash ? <Hash value={p.manifest_hash} /> : '—',
                },
                { term: t('ops.c.created'), detail: formatDateTime(locale, p.created_at) },
                {
                  term: t('ops.publications.approvals'),
                  detail:
                    approvals.length === 0
                      ? '—'
                      : approvals
                          .map(
                            (a) =>
                              `${t(`ops.publications.steps.${a.step}`)} · ${formatDateTime(locale, a.created_at)}`,
                          )
                          .join(' / '),
                },
              ]}
            />
          </Panel>
          {p.manifest && (
            <Panel title={t('ops.publications.manifest')}>
              <pre className="hash max-h-96 overflow-auto rounded-xl bg-mist p-4 whitespace-pre-wrap">
                {JSON.stringify(p.manifest, null, 2)}
              </pre>
            </Panel>
          )}
        </div>
        <div className="space-y-6">
          {(canApproveReview || canApprovePublish) && p.manifest_hash && (
            <Panel
              title={t('ops.publications.approveStep', {
                step: t(`ops.publications.steps.${canApproveReview ? 'review' : 'publish'}`),
              })}
            >
              <WorkflowForm
                op="approve_publication"
                fields={{
                  id: p.id,
                  step: canApproveReview ? 'review' : 'publish',
                  manifest_hash: p.manifest_hash,
                  decision: 'approve',
                }}
                submitLabel={t('ops.c.approve')}
                tone="blue"
              />
            </Panel>
          )}
          {staff.has('publisher') && p.status === 'approved' && (
            <Panel title={t('ops.publications.anchor')}>
              <p className="mb-4 text-sm text-muted">{t('ops.publications.anchorNote')}</p>
              <WorkflowForm
                op="anchor_publication"
                fields={{ id: p.id }}
                submitLabel={t('ops.publications.anchor')}
                tone="blue"
              />
            </Panel>
          )}
          {staff.has('publisher') && p.status === 'published' && (
            <Panel title={t('ops.publications.retract')}>
              <p className="mb-4 text-sm text-muted">{t('ops.publications.retractNote')}</p>
              <WorkflowForm
                op="retract_publication"
                fields={{ id: p.id }}
                submitLabel={t('ops.publications.retract')}
                tone="danger"
                reason
                reasonRequired
              />
            </Panel>
          )}
        </div>
      </div>
    </>
  );
}
