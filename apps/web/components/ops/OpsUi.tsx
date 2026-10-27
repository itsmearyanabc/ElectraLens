import type { ReactNode } from 'react';

import { Badge, type Tone } from '@/components/ui/Badge';

/** Console page title block. */
export function OpsHeader({
  title,
  lede,
  actions,
}: {
  title: string;
  lede?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-[2.25rem] sm:text-[2.5rem]">{title}</h1>
        {lede && <p className="mt-2 max-w-2xl text-muted">{lede}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Panel({
  title,
  children,
  className = '',
}: {
  title?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`card p-6 ${className}`}>
      {title && <h2 className="mb-4 !font-sans text-lg font-bold">{title}</h2>}
      {children}
    </section>
  );
}

const STATUS_TONE: Record<string, Tone> = {
  approved: 'blue',
  published: 'navy',
  validated: 'blue',
  ready_for_review: 'orange',
  in_review: 'orange',
  pending: 'orange',
  queued: 'muted',
  running: 'blue',
  preparing: 'muted',
  succeeded: 'blue',
  accepted: 'blue',
  downgraded: 'orange',
  frozen: 'blue',
  draft: 'muted',
  failed: 'danger',
  dead: 'danger',
  rejected: 'danger',
  retracted: 'danger',
  quarantined: 'danger',
};

export function StatusChip({ status, label }: { status: string; label: string }) {
  return <Badge tone={STATUS_TONE[status] ?? 'muted'}>{label}</Badge>;
}

/** A compact table for console lists. */
export function OpsTable({
  head,
  children,
  empty,
}: {
  head: string[];
  children: ReactNode;
  empty?: string | null;
}) {
  return (
    <div className="card overflow-x-auto !shadow-none">
      <table className="w-full text-left text-[0.9375rem] [&_td]:border-t [&_td]:border-line [&_td]:px-4 [&_td]:py-3">
        <thead>
          <tr>
            {head.map((h) => (
              <th
                key={h}
                scope="col"
                className="bg-mist px-4 py-3 font-mono text-[0.75rem] font-semibold tracking-[0.08em] text-muted uppercase"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
      {empty && <p className="px-4 py-8 text-center text-muted">{empty}</p>}
    </div>
  );
}
