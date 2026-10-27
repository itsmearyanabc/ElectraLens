import type { ReactNode } from 'react';

export interface BarSeries {
  key: string;
  label: string;
  tone: 'blue' | 'saffron' | 'navy';
}

export interface BarRow {
  key: string;
  label: ReactNode;
  /** One value per series; null means suppressed (fewer than 10). */
  values: (number | null)[];
}

const FILL = { blue: '#1546b0', saffron: '#ff9933', navy: '#0a2a66' } as const;
const SWATCH = { blue: 'bg-blue', saffron: 'bg-saffron', navy: 'bg-navy' } as const;

/**
 * Horizontal bars drawn as SVG (sizes are attributes, so the strict CSP needs no inline styles),
 * always followed by the same numbers as a table (NFR-7). Server-rendered: no client JavaScript.
 */
export function BarList({
  id,
  title,
  description,
  series,
  rows,
  format,
  suppressedLabel,
  tableLabel,
}: {
  id: string;
  title: string;
  description?: ReactNode;
  series: BarSeries[];
  rows: BarRow[];
  format: (value: number) => string;
  suppressedLabel: string;
  tableLabel: string;
}) {
  const max = Math.max(1, ...rows.flatMap((row) => row.values.map((v) => Math.abs(v ?? 0))));
  return (
    <figure aria-labelledby={`${id}-title`} className="card p-5">
      <figcaption>
        <h3 id={`${id}-title`} className="text-lg">
          {title}
        </h3>
        {description && <p className="mt-1 text-sm text-muted">{description}</p>}
      </figcaption>
      {series.length > 1 && (
        <ul className="mt-3 flex flex-wrap gap-4 text-sm" aria-hidden="true">
          {series.map((s) => (
            <li key={s.key} className="flex items-center gap-1.5">
              <span className={`inline-block h-3 w-3 rounded-sm ${SWATCH[s.tone]}`} />
              {s.label}
            </li>
          ))}
        </ul>
      )}
      <div className="mt-4 space-y-3" aria-hidden="true">
        {rows.map((row) => (
          <div key={row.key} className="grid grid-cols-[minmax(6rem,11rem)_1fr] items-center gap-3">
            <div className="truncate text-sm font-semibold text-ink">{row.label}</div>
            <div className="space-y-1">
              {series.map((s, index) => {
                const value = row.values[index] ?? null;
                const width = value === null ? 0 : (Math.abs(value) / max) * 100;
                return (
                  <div key={s.key} className="flex items-center gap-2">
                    <svg
                      viewBox="0 0 100 10"
                      preserveAspectRatio="none"
                      className="h-3.5 flex-1 overflow-visible"
                      focusable="false"
                    >
                      <rect width="100" height="10" rx="2" fill="#f4f7fc" />
                      {width > 0 && (
                        <rect width={Math.max(width, 0.8)} height="10" rx="2" fill={FILL[s.tone]} />
                      )}
                    </svg>
                    <span className="w-20 shrink-0 text-right text-sm tabular-nums text-ink">
                      {value === null ? `< 10` : format(value)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      <details className="mt-4">
        <summary className="cursor-pointer text-sm font-semibold text-blue">{tableLabel}</summary>
        <table className="mt-2 w-full text-left text-sm">
          <caption className="sr-only">{title}</caption>
          <thead>
            <tr className="border-b border-line">
              <th scope="col" className="py-1.5 pr-3"></th>
              {series.map((s) => (
                <th key={s.key} scope="col" className="py-1.5 pr-3 text-right">
                  {s.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.key} className="border-b border-line/70">
                <th scope="row" className="py-1.5 pr-3 font-normal">
                  {row.label}
                </th>
                {row.values.map((value, index) => (
                  <td key={index} className="py-1.5 pr-3 text-right tabular-nums">
                    {value === null ? <abbr title={suppressedLabel}>{'< 10'}</abbr> : format(value)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}
