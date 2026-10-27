import { getTranslations } from 'next-intl/server';

import { OpsHeader } from '@/components/ops/OpsUi';
import { Notice } from '@/components/ui/Page';
import { Link } from '@/i18n/navigation';
import { requireStaff } from '@/lib/auth';
import type { Enums } from '@/lib/data/types';
import { pageLocale } from '@/lib/locale';
import { sessionDb } from '@/lib/supabase/server';

type Role = Enums['staff_role'];

/** O03: what is waiting for this person, by role. */
export default async function OpsDashboard({ params }: PageProps<'/[locale]/ops'>) {
  const locale = await pageLocale(params);
  const staff = await requireStaff(locale);
  const t = await getTranslations('ops');
  const db = await sessionDb();
  const count = async (query: PromiseLike<{ count: number | null }>) => (await query).count ?? 0;
  const head = { count: 'exact' as const, head: true };

  const queues: [string, string, Role[], () => Promise<number>][] = [
    [
      'datasetsValidated',
      '/ops/datasets',
      ['data_steward'],
      () => count(db.from('dataset_versions').select('id', head).eq('status', 'validated')),
    ],
    [
      'runsReady',
      '/ops/runs',
      ['analyst', 'reviewer', 'publisher'],
      () => count(db.from('audit_runs').select('id', head).eq('status', 'ready_for_review')),
    ],
    [
      'findingsPending',
      '/ops/findings',
      ['reviewer'],
      () => count(db.from('anomaly_findings').select('id', head).eq('review_status', 'pending')),
    ],
    [
      'publicationsInReview',
      '/ops/publications',
      ['reviewer', 'publisher'],
      () =>
        count(db.from('publications').select('id', head).in('status', ['in_review', 'approved'])),
    ],
    [
      'claimsModeration',
      '/ops/claims',
      ['reviewer'],
      () => count(db.from('claim_submissions').select('id', head).eq('status', 'in_moderation')),
    ],
    [
      'jobsFailed',
      '/ops/jobs',
      ['sysadmin', 'analyst', 'data_steward'],
      () => count(db.from('jobs').select('id', head).in('status', ['failed', 'dead'])),
    ],
  ];
  const visible = await Promise.all(
    queues
      .filter(([, , roles]) => staff.has(...roles))
      .map(async ([key, href, , load]) => ({ key, href, value: await load() })),
  );

  return (
    <>
      <OpsHeader title={t('dashboard.title')} lede={t('dashboard.lede')} />
      <Notice tone="info">{t('consoleNote')}</Notice>
      <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {visible.map((queue) => (
          <li key={queue.key}>
            <Link
              href={queue.href}
              className="card flex h-full flex-col gap-3 p-6 no-underline transition-all hover:-translate-y-0.5 hover:shadow-[var(--shadow-float)]"
            >
              <span className="mono-label">{t(`dashboard.queues.${queue.key}`)}</span>
              <span
                className={`display text-[3rem] leading-none ${queue.value > 0 ? 'text-saffron' : 'text-ink'}`}
              >
                {queue.value}
              </span>
            </Link>
          </li>
        ))}
      </ul>
      <section className="card mt-8 p-6">
        <h2 className="!font-sans text-lg font-bold">{t('dashboard.yourRoles')}</h2>
        <ul className="mt-4 flex flex-wrap gap-2">
          {staff.roles.map((role) => (
            <li
              key={role.id}
              className="rounded-full bg-blue-tint px-3 py-1 text-sm font-semibold text-blue-deep"
            >
              {t(`roles.${role.role}`)} ·{' '}
              {role.jurisdiction_id ? role.jurisdiction_id.slice(0, 8) : t('scopeAll')}
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
