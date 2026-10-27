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
import { Link } from '@/i18n/navigation';

import { CodeStep } from './CodeStep';

/** Sign in to an existing account: email a 6-digit code, then type it in. */
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
    return (
      <CodeStep email={sent.email} verify={verifySignInCode} onRestart={() => setRestart(1)} />
    );
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
            {sent.message === 'noAccount' && (
              <>
                {' '}
                <Link href="/account/sign-up" className="underline">
                  {t('createAccount')}
                </Link>
              </>
            )}
          </p>
        )}
        <button type="submit" className="btn btn-primary w-full" disabled={sending}>
          {t('sendCode')}
        </button>
      </form>
      <p className="text-center text-sm text-muted">
        {t('newHere')}{' '}
        <Link href="/account/sign-up" className="font-bold">
          {t('createAccount')}
        </Link>
      </p>
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
