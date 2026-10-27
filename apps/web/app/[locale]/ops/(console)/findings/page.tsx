import { getTranslations } from 'next-intl/server';

import { OpsHeader, OpsTable, StatusChip } from '@/components/ops/OpsUi';
import { Link } from '@/i18n/navigation';
import { requireStaff } from '@/lib/auth';
import { ruleName } from '@/lib/findings';
import { pageLocale } from '@/lib/locale';
import { sessionDb } from '@/lib/supabase/server';

/** O10: pending findings first. */
export default async function OpsFindings({ params }: PageProps<'/[locale]/ops/findings'>) {
  const locale = await pageLocale(params);
  await requireStaff(locale);
  const t = await getTranslations();
  const db = await sessionDb();
  const { data } = await db
    .from('anomaly_findings')
    .select('id, finding_code, rule_id, signal_strength, review_status, run_id')
    .order('review_status', { ascending: false })
    .order('finding_code')
    .limit(200);
  const rows = data ?? [];
  return (
    <>
      <OpsHeader title={t('ops.findings.title')} lede={t('ops.findings.lede')} />
      <OpsTable
        head={['Code', t('ops.c.kind'), t('findings.strength'), t('ops.c.status')]}
        empty={rows.length === 0 ? t('ops.c.empty') : null}
      >
        {rows.map((f) => (
          <tr key={f.id}>
            <td>
              <Link href={`/ops/findings/${f.id}`} className="font-mono font-bold">
                {f.finding_code}
              </Link>
            </td>
            <td>
              {f.rule_id} · {ruleName(locale, f.rule_id)}
            </td>
            <td>{t(`strength.${f.signal_strength}`)}</td>
            <td>
              <StatusChip status={f.review_status} label={t(`review.${f.review_status}`)} />
            </td>
          </tr>
        ))}
      </OpsTable>
    </>
  );
}
