'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useActionState, useEffect, type ReactNode } from 'react';

import { runWorkflow, type OpsState } from '@/app/[locale]/ops/actions';
import { useRouter } from '@/i18n/navigation';

/**
 * One console action: hidden fields name the workflow function and its target, children add the
 * inputs. The result (or the database's refusal, in plain words) appears under the button.
 */
export function WorkflowForm({
  op,
  fields = {},
  submitLabel,
  tone = 'primary',
  reason = false,
  reasonRequired = false,
  children,
  className = '',
  openPath,
}: {
  op: string;
  fields?: Record<string, string>;
  submitLabel: string;
  tone?: 'primary' | 'blue' | 'outline' | 'danger';
  reason?: boolean;
  reasonRequired?: boolean;
  children?: ReactNode;
  className?: string;
  /** After success, open `${openPath}${new id}` (for actions that create something). */
  openPath?: string;
}) {
  const t = useTranslations('ops');
  const locale = useLocale();
  const [state, action, pending] = useActionState<OpsState, FormData>(runWorkflow, {
    status: 'idle',
  });
  const router = useRouter();
  useEffect(() => {
    if (state.status === 'ok' && openPath && state.id) router.push(`${openPath}${state.id}`);
  }, [state, openPath, router]);
  const errorText =
    state.message === 'invalid_json'
      ? t('methodology.invalidJson')
      : state.message && t.has(`errors.${state.message}`)
        ? t(`errors.${state.message}`)
        : t('errors.generic');

  return (
    <form action={action} className={`space-y-4 ${className}`}>
      <input type="hidden" name="op" value={op} />
      <input type="hidden" name="locale" value={locale} />
      {Object.entries(fields).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      {children}
      {reason && (
        <div>
          <label htmlFor={`${op}-reason`} className="label">
            {t('c.reason')}
          </label>
          <textarea
            id={`${op}-reason`}
            name="reason"
            rows={3}
            required={reasonRequired}
            maxLength={2000}
            className="field"
          />
          <p className="mt-1 text-sm text-muted">{t('c.reasonHelp')}</p>
        </div>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" className={`btn btn-${tone}`} disabled={pending}>
          {submitLabel}
        </button>
        <span role="status" aria-live="polite">
          {state.status === 'ok' && <span className="font-semibold text-blue">{t('c.done')}</span>}
          {state.status === 'error' && (
            <span className="font-semibold text-danger">{errorText}</span>
          )}
        </span>
      </div>
    </form>
  );
}
