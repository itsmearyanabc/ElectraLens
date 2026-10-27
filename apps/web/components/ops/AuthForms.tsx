'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useActionState } from 'react';

import { staffSignIn, verifyMfa, type OpsState } from '@/app/[locale]/ops/actions';

export function StaffLoginForm({ notStaff }: { notStaff: boolean }) {
  const t = useTranslations('ops.login');
  const locale = useLocale();
  const [state, action, pending] = useActionState<OpsState, FormData>(staffSignIn, {
    status: 'idle',
  });
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="locale" value={locale} />
      <div>
        <label htmlFor="email" className="label">
          {t('email')}
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          required
          className="field"
        />
      </div>
      <div>
        <label htmlFor="password" className="label">
          {t('password')}
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="field"
        />
      </div>
      {(state.status === 'error' || notStaff) && (
        <p role="alert" className="font-semibold text-danger">
          {state.status === 'error' ? t('failed') : t('notStaff')}
        </p>
      )}
      <button type="submit" className="btn btn-primary w-full" disabled={pending}>
        {t('submit')}
      </button>
    </form>
  );
}

export function MfaForm({ factorId }: { factorId: string }) {
  const t = useTranslations('ops.mfa');
  const locale = useLocale();
  const [state, action, pending] = useActionState<OpsState, FormData>(verifyMfa, {
    status: 'idle',
  });
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="factor" value={factorId} />
      <div>
        <label htmlFor="code" className="label">
          {t('code')}
        </label>
        <input
          id="code"
          name="code"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9]{6}"
          maxLength={6}
          required
          className="field text-center font-mono text-2xl tracking-[0.5em]"
        />
      </div>
      {state.status === 'error' && (
        <p role="alert" className="font-semibold text-danger">
          {t('failed')}
        </p>
      )}
      <button type="submit" className="btn btn-primary w-full" disabled={pending}>
        {t('verify')}
      </button>
    </form>
  );
}
