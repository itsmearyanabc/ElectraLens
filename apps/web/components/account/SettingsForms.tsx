'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useActionState } from 'react';

import {
  deleteAccount,
  updateProfile,
  type FormState,
} from '@/app/[locale]/(site)/account/actions';

export interface Profile {
  display_name: string | null;
  preferred_language: string;
  notify_email: boolean;
}

export function ProfileForm({ profile }: { profile: Profile }) {
  const t = useTranslations('account');
  const [state, action, pending] = useActionState<FormState, FormData>(updateProfile, {
    status: 'idle',
  });
  return (
    <form action={action} className="card space-y-5 p-6 sm:p-8">
      <div>
        <label htmlFor="display_name" className="label">
          {t('displayName')}
        </label>
        <input
          id="display_name"
          name="display_name"
          defaultValue={profile.display_name ?? ''}
          maxLength={80}
          className="field"
        />
        <p className="mt-1 text-sm text-muted">{t('displayNameHelp')}</p>
      </div>
      <div>
        <label htmlFor="preferred_language" className="label">
          {t('language')}
        </label>
        <select
          id="preferred_language"
          name="preferred_language"
          defaultValue={profile.preferred_language}
          className="field"
        >
          <option value="en">English</option>
          <option value="hi">हिन्दी</option>
        </select>
      </div>
      <label className="flex items-start gap-3">
        <input
          type="checkbox"
          name="notify_email"
          defaultChecked={profile.notify_email}
          className="mt-1.5 h-4 w-4 accent-[#2864dc]"
        />
        <span className="font-semibold">{t('notifyEmail')}</span>
      </label>
      <div className="flex items-center gap-4">
        <button type="submit" className="btn btn-primary" disabled={pending}>
          {t('settingsTitle')}
        </button>
        {state.status === 'ok' && (
          <p role="status" className="font-semibold text-blue">
            {t('saved')}
          </p>
        )}
      </div>
    </form>
  );
}

export function DeleteAccountForm({ available }: { available: boolean }) {
  const t = useTranslations('account');
  const locale = useLocale();
  const [state, action, pending] = useActionState<FormState, FormData>(deleteAccount, {
    status: 'idle',
  });
  return (
    <form
      action={action}
      className="rounded-[var(--radius-card)] border-2 border-danger/30 bg-danger-tint/50 p-6 sm:p-8"
    >
      <h2 className="text-[1.625rem]">{t('dangerTitle')}</h2>
      <p className="mt-2 text-muted">{t('dangerText')}</p>
      {available ? (
        <>
          <input type="hidden" name="locale" value={locale} />
          <label htmlFor="confirm" className="label mt-5">
            {t('deleteConfirm')}
          </label>
          <input id="confirm" name="confirm" autoComplete="off" className="field max-w-xs" />
          <button type="submit" className="btn btn-danger mt-4" disabled={pending}>
            {t('deleteButton')}
          </button>
          {state.status === 'error' && (
            <p role="alert" className="mt-3 font-semibold text-danger">
              {state.message === 'confirm' ? t('deleteConfirm') : t('deleteUnavailable')}
            </p>
          )}
        </>
      ) : (
        <p className="mt-4 font-semibold text-ink">{t('deleteUnavailable')}</p>
      )}
    </form>
  );
}
