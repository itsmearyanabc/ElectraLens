import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { OpsNav } from '@/components/ops/OpsNav';
import { LogoMark, Wordmark } from '@/components/ui/Logo';
import { Link } from '@/i18n/navigation';
import { requireStaff } from '@/lib/auth';
import type { Enums } from '@/lib/data/types';
import { pageLocale } from '@/lib/locale';

export const metadata: Metadata = { robots: { index: false, follow: false } };

type Role = Enums['staff_role'];
const ALL: Role[] = [
  'sysadmin',
  'data_steward',
  'analyst',
  'reviewer',
  'publisher',
  'security_auditor',
];
const SECTIONS: [string, string, Role[]][] = [
  ['/ops', 'dashboard', ALL],
  ['/ops/datasets', 'datasets', ['data_steward', 'analyst', 'reviewer']],
  ['/ops/runs', 'runs', ['analyst', 'reviewer', 'publisher']],
  ['/ops/findings', 'findings', ['reviewer', 'analyst']],
  ['/ops/publications', 'publications', ['publisher', 'reviewer']],
  ['/ops/claims', 'claims', ['reviewer']],
  ['/ops/complaints', 'complaints', ['reviewer', 'sysadmin']],
  ['/ops/booths', 'booths', ['data_steward']],
  ['/ops/methodology', 'methodology', ['analyst', 'publisher']],
  ['/ops/staff', 'staff', ['sysadmin']],
  ['/ops/audit', 'audit', ['security_auditor', 'sysadmin']],
  ['/ops/security', 'security', ['security_auditor', 'sysadmin']],
  ['/ops/jobs', 'jobs', ALL],
];

/** B15.01: the console shell. Navigation follows the roles; the database enforces them. */
export default async function ConsoleLayout({ children, params }: LayoutProps<'/[locale]/ops'>) {
  const locale = await pageLocale(params);
  const staff = await requireStaff(locale);
  const t = await getTranslations('ops');
  const common = await getTranslations('common');
  const items = SECTIONS.filter(([, , roles]) => staff.has(...roles)).map(([href, key]) => ({
    href,
    label: t(`nav.${key}`),
  }));

  return (
    <div className="flex min-h-dvh bg-mist">
      <aside className="on-dark glow-dark sticky top-0 hidden h-dvh w-72 shrink-0 flex-col p-5 text-white lg:flex">
        <Link href="/ops" className="flex items-center gap-3 px-2 no-underline">
          <LogoMark size={36} />
          <span className="flex flex-col leading-tight">
            <span className="display text-xl text-white">
              Electra<span className="text-saffron">Lens</span>
            </span>
            <span className="font-mono text-[0.6875rem] tracking-widest text-white/60 uppercase">
              {t('consoleTitle')}
            </span>
          </span>
        </Link>
        <div className="mt-8 flex-1 overflow-y-auto">
          <OpsNav items={items} />
        </div>
        <div className="dark-panel mt-4 p-4 text-sm">
          <p className="truncate font-semibold">{staff.user.email}</p>
          <ul className="mt-2 flex flex-wrap gap-1">
            {staff.roles.map((role) => (
              <li key={role.id} className="rounded-full bg-white/10 px-2 py-0.5 text-xs">
                {t(`roles.${role.role}`)}
              </li>
            ))}
          </ul>
          <form action="/auth/sign-out" method="post" className="mt-3">
            <input type="hidden" name="next" value={`/${locale}/ops/login`} />
            <button
              type="submit"
              className="text-sm font-semibold text-saffron-soft hover:underline"
            >
              {common('signOut')}
            </button>
          </form>
        </div>
      </aside>
      <div className="min-w-0 flex-1">
        <header className="flex items-center justify-between gap-3 border-b border-line bg-white px-5 py-3 lg:hidden">
          <Link href="/ops" className="flex items-center gap-2 no-underline">
            <LogoMark size={32} />
            <Wordmark className="text-lg" />
          </Link>
          <details className="relative">
            <summary className="btn btn-outline btn-sm list-none [&::-webkit-details-marker]:hidden">
              {t('consoleTitle')}
            </summary>
            <div className="card-float absolute right-0 z-50 mt-2 w-72 p-2">
              <OpsNav items={items} light />
            </div>
          </details>
        </header>
        <main id="main" className="mx-auto max-w-6xl px-5 py-8 sm:px-8 sm:py-10">
          {children}
        </main>
      </div>
    </div>
  );
}
