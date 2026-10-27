'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useActionState } from 'react';

import {
  sendMagicLink,
  signInWithGoogle,
  type FormState,
} from '@/app/[locale]/(site)/account/actions';

export function SignInForm({ initialError }: { initialError?: string }) {
  const t = useTranslations('auth');
  const locale = useLocale();
  const [state, action, pending] = useActionState<FormState, FormData>(sendMagicLink, {
    status: initialError ? 'error' : 'idle',
    message: initialError,
  });

  if (state.status === 'ok') {
    return (
      <div role="status" className="rounded-2xl bg-blue-tint p-6">
        <p className="text-lg font-bold text-ink">{t('linkSent', { email: state.email ?? '' })}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
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
            autoComplete="email"
            required
            className="field"
          />
        </div>
        {state.status === 'error' && state.message && (
          <p role="alert" className="font-semibold text-danger">
            {t(state.message)}
          </p>
        )}
        <button type="submit" className="btn btn-primary w-full" disabled={pending}>
          {t('sendLink')}
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
