import { getTranslations } from 'next-intl/server';

import { OpsHeader, OpsTable } from '@/components/ops/OpsUi';
import { requireStaff } from '@/lib/auth';
import { formatDateTime } from '@/lib/format';
import { pageLocale } from '@/lib/locale';
import { sessionDb } from '@/lib/supabase/server';

/** O22: security events and incidents, read-only. */
export default async function OpsSecurity({ params }: PageProps<'/[locale]/ops/security'>) {
  const locale = await pageLocale(params);
  await requireStaff(locale);
  const t = await getTranslations('ops');
  const db = await sessionDb();
  const [{ data: events }, { data: incidents }] = await Promise.all([
    db
      .from('security_events')
      .select('id, at, event_type, details')
      .order('at', { ascending: false })
      .limit(200),
    db
      .from('incident_records')
      .select('id, opened_at, severity, title, status')
      .order('opened_at', { ascending: false }),
  ]);
  return (
    <>
      <OpsHeader title={t('security.title')} />
      <OpsTable
        head={[t('c.when'), t('security.event'), t('c.details')]}
        empty={(events ?? []).length === 0 ? t('c.empty') : null}
      >
        {(events ?? []).map((e) => (
          <tr key={e.id}>
            <td className="whitespace-nowrap">{formatDateTime(locale, e.at)}</td>
            <td className="font-mono text-sm">{e.event_type}</td>
            <td className="hash text-muted">{JSON.stringify(e.details)}</td>
          </tr>
        ))}
      </OpsTable>
      <h2 className="mt-10 mb-4 text-[1.75rem]">{t('security.incidents')}</h2>
      <OpsTable
        head={[t('c.when'), t('c.kind'), t('c.details'), t('c.status')]}
        empty={(incidents ?? []).length === 0 ? t('c.empty') : null}
      >
        {(incidents ?? []).map((i) => (
          <tr key={i.id}>
            <td>{formatDateTime(locale, i.opened_at)}</td>
            <td>{i.severity}</td>
            <td>{i.title}</td>
            <td>{i.status}</td>
          </tr>
        ))}
      </OpsTable>
    </>
  );
}
