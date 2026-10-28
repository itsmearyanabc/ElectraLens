import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';

import { ComplaintThread, type ThreadMessage } from '@/components/complaints/ComplaintThread';
import { StatusForm } from '@/components/complaints/StatusForm';
import { OpsHeader } from '@/components/ops/OpsUi';
import { Badge } from '@/components/ui/Badge';
import { Link } from '@/i18n/navigation';
import { areaLabels } from '@/lib/areas';
import { requireStaff } from '@/lib/auth';
import { STATUS_TONE, type ComplaintStatus } from '@/lib/complaints';
import { isUuid } from '@/lib/data/public';
import { formatDate } from '@/lib/format';
import { pageLocale } from '@/lib/locale';
import { sessionDb } from '@/lib/supabase/server';

import { staffReply } from '../../../complaint-actions';

/** One complaint for the responsible official: the citizen's account of it, replies, status. */
export default async function OpsComplaint({ params }: PageProps<'/[locale]/ops/complaints/[id]'>) {
  const locale = await pageLocale(params);
  await requireStaff(locale);
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const db = await sessionDb();
  const { data: complaint } = await db
    .from('complaints')
    .select('id, reference, title, status, category, jurisdiction_id, user_id, created_at')
    .eq('id', id)
    .maybeSingle();
  if (!complaint) notFound();
  const [{ data: messages }, labels, t] = await Promise.all([
    db
      .from('complaint_messages')
      .select('id, author_role, body, created_at')
      .eq('complaint_id', id)
      .order('created_at'),
    areaLabels([complaint.jurisdiction_id], locale),
    getTranslations('complaints'),
  ]);

  return (
    <>
      <OpsHeader title={complaint.title} />
      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <div className="space-y-5">
          <div className="flex flex-wrap items-center gap-3">
            <Badge tone={STATUS_TONE[complaint.status as ComplaintStatus]}>
              {t(`status.${complaint.status}`)}
            </Badge>
            <span className="hash text-sm">{complaint.reference}</span>
            <span className="text-sm text-muted">
              {t(`category.${complaint.category}`)} ·{' '}
              {labels.get(complaint.jurisdiction_id)?.label ?? '—'} ·{' '}
              {formatDate(locale, complaint.created_at)}
            </span>
          </div>
          <p className="rounded-2xl bg-blue-tint p-4 text-sm">{t('staff.verifiedNote')}</p>
          <ComplaintThread
            complaintId={complaint.id}
            messages={(messages ?? []) as ThreadMessage[]}
            reply={staffReply}
            viewer="staff"
            closed={complaint.status === 'closed'}
          />
        </div>
        <div className="space-y-4">
          {complaint.status !== 'closed' && (
            <StatusForm complaintId={complaint.id} current={complaint.status} />
          )}
          <Link href="/ops/complaints" className="font-bold">
            ← {t('staff.back')}
          </Link>
        </div>
      </div>
    </>
  );
}
