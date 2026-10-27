import type { ReactNode } from 'react';

export function PageHeader({
  eyebrow,
  title,
  lede,
  actions,
  children,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  lede?: ReactNode;
  actions?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <header className="glow border-b border-line/70">
      <div className="container-page pt-14 pb-12 sm:pt-20 sm:pb-14">
        {eyebrow && <p className="eyebrow mb-4">{eyebrow}</p>}
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div className="max-w-3xl">
            <h1 className="text-[2.5rem] sm:text-[3.25rem]">{title}</h1>
            {lede && <p className="mt-5 text-lg text-muted sm:text-xl">{lede}</p>}
          </div>
          {actions && <div className="flex flex-wrap gap-3">{actions}</div>}
        </div>
        {children}
      </div>
    </header>
  );
}

export function Section({
  title,
  id,
  eyebrow,
  description,
  children,
  className = '',
}: {
  title?: ReactNode;
  id?: string;
  eyebrow?: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section aria-labelledby={title && id ? id : undefined} className={`py-10 ${className}`}>
      {eyebrow && <p className="eyebrow mb-3">{eyebrow}</p>}
      {title && (
        <h2 id={id} className="text-[1.875rem] sm:text-[2.125rem]">
          {title}
        </h2>
      )}
      {description && <p className="mt-3 max-w-3xl text-muted">{description}</p>}
      <div className={title || description ? 'mt-7' : ''}>{children}</div>
    </section>
  );
}

type NoticeTone = 'info' | 'caution' | 'danger';

const NOTICE_TONES: Record<NoticeTone, { box: string; dot: string }> = {
  info: { box: 'bg-blue-tint', dot: 'bg-blue' },
  caution: { box: 'bg-saffron-tint', dot: 'bg-saffron' },
  danger: { box: 'bg-danger-tint', dot: 'bg-danger' },
};

export function Notice({
  tone = 'info',
  title,
  children,
  role,
}: {
  tone?: NoticeTone;
  title?: ReactNode;
  children?: ReactNode;
  role?: 'status' | 'alert';
}) {
  const style = NOTICE_TONES[tone];
  return (
    <div role={role} className={`flex gap-3 rounded-2xl px-5 py-4 ${style.box}`}>
      <span aria-hidden="true" className={`mt-2 h-2 w-2 shrink-0 rounded-full ${style.dot}`} />
      <div className="min-w-0 text-ink">
        {title && <p className="font-bold">{title}</p>}
        {children && <div className={title ? 'mt-1' : ''}>{children}</div>}
      </div>
    </div>
  );
}

export function EmptyState({ title, children }: { title: ReactNode; children?: ReactNode }) {
  return (
    <div className="rounded-[var(--radius-card)] border border-dashed border-line-strong bg-mist px-6 py-14 text-center">
      <p className="display text-2xl text-ink">{title}</p>
      {children && <div className="mx-auto mt-3 max-w-xl text-muted">{children}</div>}
    </div>
  );
}

export function StatTile({
  label,
  value,
  hint,
  accent = false,
}: {
  label: ReactNode;
  value: ReactNode;
  hint?: ReactNode;
  accent?: boolean;
}) {
  return (
    <div className="card flex flex-col gap-2 p-5">
      <span className="flex items-center gap-2">
        <span
          aria-hidden="true"
          className={`h-2 w-2 rounded-full ${accent ? 'bg-saffron' : 'bg-blue'}`}
        />
        <span className="mono-label">{label}</span>
      </span>
      <span className="display text-[2.25rem] leading-none text-ink tabular-nums">{value}</span>
      {hint && <span className="text-sm text-muted">{hint}</span>}
    </div>
  );
}

/** A full hash, wrapped, in monospace. Hashes are never shortened where someone may compare them. */
export function Hash({ value, label }: { value: string; label?: string }) {
  return (
    <code className="hash rounded-lg bg-mist px-2 py-1 text-ink" aria-label={label}>
      {value}
    </code>
  );
}

export function DefinitionList({ items }: { items: { term: ReactNode; detail: ReactNode }[] }) {
  return (
    <dl className="divide-y divide-line">
      {items.map((item, index) => (
        <div
          key={index}
          className="grid gap-1 py-3.5 first:pt-0 last:pb-0 sm:grid-cols-[13rem_1fr] sm:gap-6"
        >
          <dt className="mono-label pt-0.5">{item.term}</dt>
          <dd className="min-w-0">{item.detail}</dd>
        </div>
      ))}
    </dl>
  );
}

/** Wide tables scroll inside their own box; the box is focusable so keyboards can scroll it. */
export function TableWrap({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div
      role="region"
      aria-label={label}
      tabIndex={0}
      className="card overflow-x-auto !shadow-none"
    >
      <table className="w-full border-collapse text-left text-[0.9375rem] [&_td]:border-t [&_td]:border-line [&_td]:px-4 [&_td]:py-3 [&_th]:px-4 [&_th]:py-3 [&_thead_th]:bg-mist [&_thead_th]:font-mono [&_thead_th]:text-[0.75rem] [&_thead_th]:font-semibold [&_thead_th]:tracking-[0.08em] [&_thead_th]:text-muted [&_thead_th]:uppercase [&_tbody_th]:border-t [&_tbody_th]:border-line [&_tbody_th]:font-semibold">
        {children}
      </table>
    </div>
  );
}

export function ExternalLink({
  href,
  children,
  official = false,
  externalLabel,
  officialLabel,
}: {
  href: string;
  children: ReactNode;
  official?: boolean;
  externalLabel: string;
  officialLabel?: string;
}) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="font-bold">
      {children}
      {official && officialLabel && (
        <span className="ml-2 rounded-full bg-ink px-2 py-0.5 align-middle font-mono text-[0.6875rem] font-semibold tracking-wider text-white uppercase">
          {officialLabel}
        </span>
      )}
      <span aria-hidden="true"> ↗</span>
      <span className="sr-only"> ({externalLabel})</span>
    </a>
  );
}
