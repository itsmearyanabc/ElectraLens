'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useActionState } from 'react';

import {
  finishEkyc,
  startEkyc,
  type EkycState,
} from '@/app/[locale]/(site)/account/complaints/actions';

/**
 * Simulated e-KYC: consent, an Aadhaar-format number and an OTP, clearly labelled as a demo.
 * Nothing goes to UIDAI or DigiLocker, and the number is never stored.
 */
export function EkycForm() {
  const t = useTranslations('complaints.ekyc');
  const locale = useLocale();
  const [start, startAction, starting] = useActionState<EkycState, FormData>(startEkyc, {
    status: 'idle',
  });
  const [finish, finishAction, finishing] = useActionState<EkycState, FormData>(finishEkyc, {
    status: 'idle',
  });
  const otpStep = start.status === 'otp' ? start : null;

  return (
    <div className="space-y-5">
      <p className="rounded-2xl border border-saffron bg-saffron-tint p-4 text-sm font-semibold text-orange-deep">
        {t('demoNotice')}
      </p>
      {!otpStep ? (
        <form action={startAction} className="space-y-4">
          <div>
            <label htmlFor="ekyc-name" className="label">
              {t('name')}
            </label>
            <input
              id="ekyc-name"
              name="name"
              autoComplete="name"
              required
              minLength={2}
              maxLength={80}
              className="field"
            />
          </div>
          <div>
            <label htmlFor="ekyc-aadhaar" className="label">
              {t('aadhaar')}
            </label>
            <input
              id="ekyc-aadhaar"
              name="aadhaar"
              inputMode="numeric"
              autoComplete="off"
              pattern="[0-9 ]{12,14}"
              maxLength={14}
              required
              className="field font-mono tracking-widest"
            />
            <p className="mt-1 text-sm text-muted">{t('aadhaarHelp')}</p>
          </div>
          <label className="flex items-start gap-3">
            <input type="checkbox" name="consent" required className="mt-1 h-4 w-4" />
            <span className="text-sm">{t('consent')}</span>
          </label>
          {start.status === 'error' && start.message && (
            <p role="alert" className="font-semibold text-danger">
              {t(`errors.${start.message}`)}
            </p>
          )}
          <button type="submit" className="btn btn-primary" disabled={starting}>
            {t('sendOtp')}
          </button>
        </form>
      ) : (
        <form action={finishAction} className="space-y-4">
          <input type="hidden" name="locale" value={locale} />
          <p className="rounded-2xl bg-blue-tint p-4">
            {t('otpSent', { last4: otpStep.last4 })}
            <br />
            <span className="text-sm text-muted">{t('demoOtpLabel')} </span>
            <span className="font-mono text-xl font-bold tracking-[0.3em]">{otpStep.demoOtp}</span>
          </p>
          <div>
            <label htmlFor="ekyc-otp" className="label">
              {t('otp')}
            </label>
            <input
              id="ekyc-otp"
              name="otp"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]{6}"
              maxLength={6}
              required
              autoFocus
              className="field max-w-[12rem] text-center font-mono text-2xl tracking-[0.4em]"
            />
          </div>
          {finish.message && (
            <p role="alert" className="font-semibold text-danger">
              {t(`errors.${finish.message}`)}
            </p>
          )}
          <button type="submit" className="btn btn-primary" disabled={finishing}>
            {t('verify')}
          </button>
        </form>
      )}
    </div>
  );
}
