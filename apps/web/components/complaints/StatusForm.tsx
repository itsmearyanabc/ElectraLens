'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useActionState } from 'react';

import type { FileState } from '@/app/[locale]/(site)/account/complaints/actions';
import { setComplaintStatus } from '@/app/[locale]/ops/complaint-actions';

/** Staff move a complaint on: in review, resolved or closed, with an optional note. */
export function StatusForm({ complaintId, current }: { complaintId: string; current: string }) {
  const t = useTranslations('complaints');
  const locale = useLocale();
  const [state, action, pending] = useActionState<FileState, FormData>(setComplaintStatus, {
    status: 'idle',
  });
  return (
    <form action={action} className="card space-y-3 p-5">
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="id" value={complaintId} />
      <label htmlFor="status" className="label">
        {t('staff.setStatus')}
      </label>
      <select id="status" name="status" defaultValue={current} className="field">
        {(['in_review', 'resolved', 'closed'] as const).map((status) => (
          <option key={status} value={status}>
            {t(`status.${status}`)}
          </option>
        ))}
      </select>
      <label htmlFor="note" className="label">
        {t('staff.note')}
      </label>
      <input id="note" name="note" maxLength={500} className="field" />
      {state.status === 'error' && (
        <p role="alert" className="font-semibold text-danger">
          {t('thread.errors.failed')}
        </p>
      )}
      <button type="submit" className="btn btn-blue btn-sm" disabled={pending}>
        {t('staff.update')}
      </button>
    </form>
  );
}
