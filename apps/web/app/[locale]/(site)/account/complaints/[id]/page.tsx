import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';

import { AccountShell } from '@/components/account/AccountShell';
import { ComplaintThread, type ThreadMessage } from '@/components/complaints/ComplaintThread';
import { Badge } from '@/components/ui/Badge';
import { Link } from '@/i18n/navigation';
import { areaLabels } from '@/lib/areas';
import { requireUser } from '@/lib/auth';
import { STATUS_TONE, type ComplaintStatus } from '@/lib/complaints';
import { isUuid } from '@/lib/data/public';
import { pageLocale } from '@/lib/locale';
import { sessionDb } from '@/lib/supabase/server';

import { replyToComplaint } from '../actions';

export async function generateMetadata({
  params,
}: PageProps<'/[locale]/account/complaints/[id]'>): Promise<Metadata> {
  const locale = await pageLocale(params);
  const t = await getTranslations({ locale, namespace: 'complaints' });
  return { title: t('title'), robots: { index: false } };
}

export default async function ComplaintPage({
  params,
}: PageProps<'/[locale]/account/complaints/[id]'>) {
  const locale = await pageLocale(params);
  const user = await requireUser(locale);
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const db = await sessionDb();
  const { data: complaint } = await db
    .from('complaints')
    .select('id, reference, title, status, category, jurisdiction_id, user_id')
    .eq('id', id)
    .maybeSingle();
  if (!complaint || complaint.user_id !== user.id) notFound();
  const [{ data: messages }, labels, t] = await Promise.all([
    db
      .from('complaint_messages')
      .select('id, author_role, body, created_at')
      .eq('complaint_id', id)
      .order('created_at'),
    areaLabels([complaint.jurisdiction_id], locale),
    getTranslations('complaints'),
  ]);
  const area = labels.get(complaint.jurisdiction_id);

  return (
    <AccountShell user={user} title={complaint.title}>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center gap-3">
          <Badge tone={STATUS_TONE[complaint.status as ComplaintStatus]}>
            {t(`status.${complaint.status}`)}
          </Badge>
          <span className="hash text-sm">{complaint.reference}</span>
          <span className="text-sm text-muted">
            {t(`category.${complaint.category}`)}
            {area && ` · ${area.label}`}
          </span>
        </div>
        <p className="text-sm text-muted">{t('routedNote')}</p>
        <ComplaintThread
          complaintId={complaint.id}
          messages={(messages ?? []) as ThreadMessage[]}
          reply={replyToComplaint}
          viewer="citizen"
          closed={complaint.status === 'closed'}
        />
        <Link href="/account/complaints" className="font-bold">
          ← {t('back')}
        </Link>
      </div>
    </AccountShell>
  );
}
