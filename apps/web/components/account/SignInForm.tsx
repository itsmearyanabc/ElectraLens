'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useActionState, useEffect, useState } from 'react';

import {
  sendSignInCode,
  signInWithGoogle,
  verifySignInCode,
  type FormState,
} from '@/app/[locale]/(site)/account/actions';
import { Turnstile } from '@/components/ui/Turnstile';

/** Email a 6-digit code, then type it in: no links that can open on the wrong host. */
export function SignInForm({
  initialError,
  turnstileSiteKey,
}: {
  initialError?: string;
  turnstileSiteKey: string | null;
}) {
  const t = useTranslations('auth');
  const locale = useLocale();
  const [restart, setRestart] = useState(0);
  const [sent, send, sending] = useActionState<FormState, FormData>(sendSignInCode, {
    status: initialError ? 'error' : 'idle',
    message: initialError,
  });

  // Turnstile tokens are single-use: every answer from the server gets a fresh widget.
  const [attempt, setAttempt] = useState(0);
  useEffect(() => setAttempt((n) => n + 1), [sent]);

  if (sent.status === 'ok' && sent.email && restart === 0) {
    return <CodeStep email={sent.email} onRestart={() => setRestart(1)} />;
  }

  return (
    <div className="space-y-6" key={restart}>
      <form action={send} className="space-y-4">
        <input type="hidden" name="locale" value={locale} />
        <div>
          <label htmlFor="email" className="label">
            {t('email')}
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            className="field"
          />
        </div>
        <Turnstile key={attempt} siteKey={turnstileSiteKey} action="sign_in" locale={locale} />
        {sent.status === 'error' && sent.message && (
          <p role="alert" className="font-semibold text-danger">
            {t(sent.message)}
          </p>
        )}
        <button type="submit" className="btn btn-primary w-full" disabled={sending}>
          {t('sendCode')}
        </button>
      </form>
      <div className="flex items-center gap-3 text-sm text-muted">
        <span className="h-px flex-1 bg-line" />
        {t('orContinue')}
        <span className="h-px flex-1 bg-line" />
      </div>
      <form action={signInWithGoogle}>
        <input type="hidden" name="locale" value={locale} />
        <button type="submit" className="btn btn-outline w-full">
          {t('google')}
        </button>
      </form>
    </div>
  );
}

function CodeStep({ email, onRestart }: { email: string; onRestart: () => void }) {
  const t = useTranslations('auth');
  const locale = useLocale();
  const [state, verify, verifying] = useActionState<FormState, FormData>(verifySignInCode, {
    status: 'ok',
    email,
  });

  return (
    <form action={verify} className="space-y-4">
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="email" value={email} />
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
      <button type="submit" className="btn btn-primary w-full" disabled={verifying}>
        {t('verify')}
      </button>
      <button type="button" onClick={onRestart} className="btn btn-ghost w-full">
        {t('differentEmail')}
      </button>
    </form>
  );
}
