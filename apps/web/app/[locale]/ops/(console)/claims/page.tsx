import { getTranslations } from 'next-intl/server';

import { OpsHeader, Panel } from '@/components/ops/OpsUi';
import { WorkflowForm } from '@/components/ops/WorkflowForm';
import { EmptyState } from '@/components/ui/Page';
import { requireStaff } from '@/lib/auth';
import { formatDateTime } from '@/lib/format';
import { pageLocale } from '@/lib/locale';
import { sessionDb } from '@/lib/supabase/server';

/** O15 / B11.06: submissions are never published automatically. */
export default async function OpsClaims({ params }: PageProps<'/[locale]/ops/claims'>) {
  const locale = await pageLocale(params);
  await requireStaff(locale);
  const t = await getTranslations('ops');
  const db = await sessionDb();
  const { data } = await db
    .from('claim_submissions')
    .select('id, text, language, created_at, claim_assessments(verdict)')
    .eq('status', 'in_moderation')
    .order('created_at');
  const claims = data ?? [];
  return (
    <>
      <OpsHeader title={t('claims.title')} />
      {claims.length === 0 ? (
        <EmptyState title={t('claims.empty')} />
      ) : (
        <ul className="space-y-4">
          {claims.map((claim) => (
            <li key={claim.id}>
              <Panel>
                <p className="text-sm text-muted">
                  {formatDateTime(locale, claim.created_at)} · {claim.language} ·{' '}
                  {claim.claim_assessments[0]?.verdict ?? '—'}
                </p>
                <p className="mt-2 text-lg">“{claim.text}”</p>
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <WorkflowForm
                    op="moderate_claim"
                    fields={{ id: claim.id, publish: 'true' }}
                    submitLabel={t('claims.publish')}
                    tone="blue"
                  />
                  <WorkflowForm
                    op="moderate_claim"
                    fields={{ id: claim.id, publish: 'false' }}
                    submitLabel={t('claims.reject')}
                    tone="outline"
                    reason
                    reasonRequired
                  />
                </div>
              </Panel>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
