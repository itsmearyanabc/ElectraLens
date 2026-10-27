import { getTranslations } from 'next-intl/server';

import { OpsHeader, OpsTable } from '@/components/ops/OpsUi';
import { WorkflowForm } from '@/components/ops/WorkflowForm';
import { Link } from '@/i18n/navigation';
import { requireStaff } from '@/lib/auth';
import { formatDate } from '@/lib/format';
import { pageLocale } from '@/lib/locale';
import { sessionDb } from '@/lib/supabase/server';

/** O19 / B15.09: sysadmins manage roles; they can't grant to themselves or publish. */
export default async function OpsStaff({ params }: PageProps<'/[locale]/ops/staff'>) {
  const locale = await pageLocale(params);
  await requireStaff(locale);
  const t = await getTranslations('ops');
  const db = await sessionDb();
  const { data } = await db
    .from('staff_assignments')
    .select('id, user_id, role, jurisdiction_id, granted_at')
    .is('revoked_at', null)
    .order('granted_at', { ascending: false });
  const rows = data ?? [];
  return (
    <>
      <OpsHeader
        title={t('staff.title')}
        lede={t('staff.selfNote')}
        actions={
          <Link href="/ops/staff/invite" className="btn btn-primary">
            {t('staff.invite')}
          </Link>
        }
      />
      <OpsTable
        head={[t('c.user'), t('c.role'), t('c.scope'), t('staff.granted'), t('c.actions')]}
        empty={rows.length === 0 ? t('c.empty') : null}
      >
        {rows.map((r) => (
          <tr key={r.id}>
            <td className="font-mono">{r.user_id.slice(0, 8)}</td>
            <td>{t(`roles.${r.role}`)}</td>
            <td>{r.jurisdiction_id ? r.jurisdiction_id.slice(0, 8) : t('scopeAll')}</td>
            <td>{formatDate(locale, r.granted_at)}</td>
            <td>
              <WorkflowForm
                op="revoke_role"
                fields={{ id: r.id, reason: 'Revoked from the console' }}
                submitLabel={t('staff.revoke')}
                tone="outline"
              />
            </td>
          </tr>
        ))}
      </OpsTable>
    </>
  );
}
