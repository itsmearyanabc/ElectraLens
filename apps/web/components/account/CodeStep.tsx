'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useActionState } from 'react';

import type { FormState } from '@/app/[locale]/(site)/account/actions';

/** The second step of sign-in and sign-up: type the 6-digit code from the email. */
export function CodeStep({
  email,
  verify,
  hidden = {},
  onRestart,
}: {
  email: string;
  verify: (previous: FormState, form: FormData) => Promise<FormState>;
  hidden?: Record<string, string>;
  onRestart: () => void;
}) {
  const t = useTranslations('auth');
  const locale = useLocale();
  const [state, action, pending] = useActionState<FormState, FormData>(verify, {
    status: 'ok',
    email,
  });

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="email" value={email} />
      {Object.entries(hidden).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      <p role="status" className="rounded-2xl bg-blue-tint p-4 font-semibold text-ink">
        {t('codeSent', { email })}
      </p>
      <div>
        <label htmlFor="code" className="label">
          {t('code')}
        </label>
        <input
          id="code"
          name="code"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9 ]{6,12}"
          maxLength={12}
          required
          autoFocus
          className="field text-center font-mono text-2xl tracking-[0.4em]"
        />
      </div>
      {state.message && (
        <p role="alert" className="font-semibold text-danger">
          {t(state.message)}
        </p>
      )}
      <button type="submit" className="btn btn-primary w-full" disabled={pending}>
        {t('verify')}
      </button>
      <button type="button" onClick={onRestart} className="btn btn-ghost w-full">
        {t('differentEmail')}
      </button>
    </form>
  );
}
