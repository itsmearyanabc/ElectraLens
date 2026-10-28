'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useActionState, useEffect, useState } from 'react';

import { staffSignIn, verifyMfa, type OpsState } from '@/app/[locale]/ops/actions';
import { PasswordField } from '@/components/ui/PasswordField';
import { Turnstile } from '@/components/ui/Turnstile';

export function StaffLoginForm({
  notStaff,
  turnstileSiteKey,
}: {
  notStaff: boolean;
  turnstileSiteKey: string | null;
}) {
  const t = useTranslations('ops.login');
  const locale = useLocale();
  const [state, action, pending] = useActionState<OpsState, FormData>(staffSignIn, {
    status: 'idle',
  });
  // Turnstile tokens are single-use; each answer gets a fresh widget and a fresh countdown.
  const [attempt, setAttempt] = useState(0);
  const [wait, setWait] = useState(0);
  useEffect(() => {
    setAttempt((n) => n + 1);
    setWait(state.wait ?? 0);
  }, [state]);
  useEffect(() => {
    if (wait <= 0) return;
    const timer = setTimeout(() => setWait((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [wait]);
  const locked = wait > 0;
  const clock = `${Math.floor(wait / 60)}:${String(wait % 60).padStart(2, '0')}`;

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
        <PasswordField
          id="password"
          name="password"
          autoComplete="current-password"
          showLabel={t('showPassword')}
          hideLabel={t('hidePassword')}
        />
      </div>
      <Turnstile key={attempt} siteKey={turnstileSiteKey} action="staff_sign_in" locale={locale} />
      {locked ? (
        <p role="alert" className="font-semibold text-danger">
          {t('locked', { time: clock })}
        </p>
      ) : (
        (state.status === 'error' || notStaff) && (
          <p role="alert" className="font-semibold text-danger">
            {state.status === 'error'
              ? t(state.message === 'notHuman' ? 'notHuman' : 'failed')
              : t('notStaff')}
          </p>
        )
      )}
      <button type="submit" className="btn btn-primary w-full" disabled={pending || locked}>
        {locked ? t('lockedButton', { time: clock }) : t('submit')}
      </button>
      <p className="text-xs text-muted">{t('lockoutNote')}</p>
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
