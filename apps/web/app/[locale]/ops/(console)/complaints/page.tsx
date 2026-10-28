import { getTranslations } from 'next-intl/server';

import { OpsHeader } from '@/components/ops/OpsUi';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/Page';
import { Link } from '@/i18n/navigation';
import { areaLabels } from '@/lib/areas';
import { requireStaff } from '@/lib/auth';
import { STATUS_TONE, type ComplaintStatus } from '@/lib/complaints';
import { formatDateTime } from '@/lib/format';
import { pageLocale } from '@/lib/locale';
import { sessionDb } from '@/lib/supabase/server';

/**
 * Citizen complaints for the areas this person is responsible for. RLS decides which rows come
 * back (reviewers covering the area, and the sysadmin), so the page never filters by role.
 */
export default async function OpsComplaints({ params }: PageProps<'/[locale]/ops/complaints'>) {
  const locale = await pageLocale(params);
  await requireStaff(locale);
  const t = await getTranslations('complaints');
  const db = await sessionDb();
  const { data } = await db
    .from('complaints')
    .select('id, reference, title, status, category, jurisdiction_id, created_at, updated_at')
    .order('status')
    .order('updated_at', { ascending: false })
    .limit(200);
  const complaints = data ?? [];
  const labels = await areaLabels(
    complaints.map((c) => c.jurisdiction_id),
    locale,
  );
  const open = complaints.filter((c) => c.status === 'submitted' || c.status === 'in_review');

  return (
    <>
      <OpsHeader title={t('staff.title')} lede={t('staff.lede', { open: open.length })} />
      {complaints.length === 0 ? (
        <EmptyState title={t('staff.empty')} />
      ) : (
        <ul className="space-y-3">
          {complaints.map((complaint) => (
            <li key={complaint.id}>
              <Link
                href={`/ops/complaints/${complaint.id}`}
                className="card block p-5 no-underline hover:border-ink"
              >
                <div className="flex flex-wrap items-center gap-3">
                  <Badge tone={STATUS_TONE[complaint.status as ComplaintStatus]}>
                    {t(`status.${complaint.status}`)}
                  </Badge>
                  <span className="hash text-sm">{complaint.reference}</span>
                  <span className="text-sm text-muted">
                    {t(`category.${complaint.category}`)} ·{' '}
                    {labels.get(complaint.jurisdiction_id)?.label ?? '—'} ·{' '}
                    {formatDateTime(locale, complaint.updated_at)}
                  </span>
                </div>
                <p className="mt-2 text-lg font-semibold text-ink">{complaint.title}</p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
