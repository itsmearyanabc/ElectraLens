'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useActionState, useEffect, useState } from 'react';

import {
  sendSignUpCode,
  verifySignUpCode,
  type CodeState,
} from '@/app/[locale]/(site)/account/actions';
import { Turnstile } from '@/components/ui/Turnstile';
import { Link } from '@/i18n/navigation';

import { CodeStep } from './CodeStep';

export interface SignUpArea {
  code: string;
  label: string;
  depth: number;
}

/** Create an account: a few details (never a voter ID), then the emailed 6-digit code. */
export function SignUpForm({
  areas,
  turnstileSiteKey,
}: {
  areas: SignUpArea[];
  turnstileSiteKey: string | null;
}) {
  const t = useTranslations('auth');
  const locale = useLocale();
  const [restart, setRestart] = useState(0);
  const [sent, send, sending] = useActionState<CodeState, FormData>(sendSignUpCode, {
    status: 'idle',
  });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => setAttempt((n) => n + 1), [sent]);

  if (sent.status === 'ok' && sent.email && sent.details && restart === 0) {
    return (
      <CodeStep
        email={sent.email}
        verify={verifySignUpCode}
        hidden={{
          name: sent.details.name,
          language: sent.details.language,
          area: sent.details.area,
          notify: String(sent.details.notify),
        }}
        onRestart={() => setRestart(1)}
      />
    );
  }

  const keep = sent.details;
  return (
    <form action={send} className="space-y-4" key={restart}>
      <input type="hidden" name="locale" value={locale} />
      <div>
        <label htmlFor="name" className="label">
          {t('name')}
        </label>
        <input
          id="name"
          name="name"
          autoComplete="name"
          minLength={2}
          maxLength={80}
          required
          defaultValue={keep?.name}
          className="field"
        />
      </div>
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
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="language" className="label">
            {t('language')}
          </label>
          <select
            id="language"
            name="language"
            defaultValue={keep?.language ?? locale}
            className="field"
          >
            <option value="en">English</option>
            <option value="hi">हिन्दी</option>
          </select>
        </div>
        <div>
          <label htmlFor="area" className="label">
            {t('homeArea')}
          </label>
          <select id="area" name="area" defaultValue={keep?.area ?? ''} className="field">
            <option value="">{t('homeAreaNone')}</option>
            {areas.map((area) => (
              <option key={area.code} value={area.code}>
                {`${'  '.repeat(area.depth)}${area.label}`}
              </option>
            ))}
          </select>
        </div>
      </div>
      <p className="text-sm text-muted">{t('homeAreaHelp')}</p>
      <label className="flex items-start gap-3">
        <input
          type="checkbox"
          name="notify"
          defaultChecked={keep?.notify ?? true}
          className="mt-1 h-4 w-4"
        />
        <span>{t('notify')}</span>
      </label>
      <label className="flex items-start gap-3">
        <input type="checkbox" name="consent" required className="mt-1 h-4 w-4" />
        <span>
          {t('consent')}{' '}
          <Link href="/privacy" className="font-bold">
            {t('privacyLink')}
          </Link>
        </span>
      </label>
      <Turnstile key={attempt} siteKey={turnstileSiteKey} action="sign_up" locale={locale} />
      {sent.status === 'error' && sent.message && (
        <p role="alert" className="font-semibold text-danger">
          {t(sent.message)}
        </p>
      )}
      <button type="submit" className="btn btn-primary w-full" disabled={sending}>
        {t('sendSignUpCode')}
      </button>
      <p className="text-center text-sm text-muted">
        {t('haveAccount')}{' '}
        <Link href="/account/sign-in" className="font-bold">
          {t('signInLink')}
        </Link>
      </p>
    </form>
  );
}
