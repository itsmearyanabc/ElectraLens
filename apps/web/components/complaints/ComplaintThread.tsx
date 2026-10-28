'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useActionState } from 'react';

import type { FileState } from '@/app/[locale]/(site)/account/complaints/actions';

export interface ThreadMessage {
  id: string;
  author_role: 'citizen' | 'staff' | 'system';
  body: string;
  created_at: string;
}

/** A complaint's messages, oldest first, and a reply box for whoever may write. */
export function ComplaintThread({
  complaintId,
  messages,
  reply,
  viewer,
  closed,
}: {
  complaintId: string;
  messages: ThreadMessage[];
  reply: (previous: FileState, form: FormData) => Promise<FileState>;
  viewer: 'citizen' | 'staff';
  closed: boolean;
}) {
  const t = useTranslations('complaints.thread');
  const locale = useLocale();
  const [state, action, pending] = useActionState<FileState, FormData>(reply, { status: 'idle' });
  const time = (iso: string) =>
    new Intl.DateTimeFormat(locale === 'hi' ? 'hi-IN' : 'en-IN', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(iso));

  return (
    <div className="space-y-5">
      <ol className="space-y-3">
        {messages.map((message) => {
          const mine = message.author_role === viewer;
          if (message.author_role === 'system') {
            return (
              <li key={message.id} className="text-center text-sm text-muted">
                {message.body} · {time(message.created_at)}
              </li>
            );
          }
          return (
            <li
              key={message.id}
              className={`max-w-[85%] rounded-2xl px-4 py-3 ${mine ? 'ml-auto bg-ink text-white' : 'border border-line bg-white'}`}
            >
              <p className={`text-xs font-bold ${mine ? 'text-white/70' : 'text-muted'}`}>
                {t(`author.${message.author_role}`)} · {time(message.created_at)}
              </p>
              <p className="mt-1 whitespace-pre-line">{message.body}</p>
            </li>
          );
        })}
      </ol>
      {closed ? (
        <p className="rounded-2xl bg-mist p-4 text-muted">{t('closed')}</p>
      ) : (
        <form action={action} className="card space-y-3 p-5">
          <input type="hidden" name="locale" value={locale} />
          <input type="hidden" name="id" value={complaintId} />
          <label htmlFor="reply-body" className="label">
            {t('reply')}
          </label>
          <textarea
            id="reply-body"
            name="body"
            rows={3}
            required
            maxLength={4000}
            className="field"
          />
          {state.status === 'error' && state.message && (
            <p role="alert" className="font-semibold text-danger">
              {t(`errors.${state.message}`)}
            </p>
          )}
          <button type="submit" className="btn btn-primary btn-sm" disabled={pending}>
            {t('send')}
          </button>
        </form>
      )}
    </div>
  );
}
