'use client';

import { useTransition } from 'react';

import { usePathname, useRouter } from '@/i18n/navigation';

export interface AreaOption {
  code: string;
  label: string;
  depth: number;
}

/**
 * Jump to any area of the publication. Works without JavaScript as a plain GET form; with it,
 * choosing an area navigates straight away.
 */
export function AreaPicker({
  options,
  current,
  publication,
  label,
  submit,
}: {
  options: AreaOption[];
  current: string;
  publication?: string;
  label: string;
  submit: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();

  return (
    <form method="get" className="flex flex-wrap items-end gap-3">
      <label className="flex min-w-0 flex-1 flex-col gap-1.5 sm:max-w-md">
        <span className="mono-label">{label}</span>
        <select
          name="area"
          defaultValue={current}
          disabled={pending}
          className="field"
          onChange={(event) => {
            const area = event.currentTarget.value;
            startTransition(() =>
              router.push({
                pathname,
                query: { area, ...(publication ? { publication } : {}) },
              }),
            );
          }}
        >
          {options.map((option) => (
            <option key={option.code} value={option.code}>
              {`${'  '.repeat(option.depth)}${option.label}`}
            </option>
          ))}
        </select>
      </label>
      {publication && <input type="hidden" name="publication" value={publication} />}
      <noscript>
        <button type="submit" className="btn btn-outline btn-sm">
          {submit}
        </button>
      </noscript>
    </form>
  );
}
