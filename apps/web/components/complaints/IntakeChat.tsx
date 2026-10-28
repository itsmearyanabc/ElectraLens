'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useActionState, useEffect, useRef, useState, useTransition } from 'react';

import {
  askIntake,
  fileComplaint,
  type FileState,
} from '@/app/[locale]/(site)/account/complaints/actions';
import type { ChatTurn } from '@/lib/ai/assistant';
import { COMPLAINT_CATEGORIES, type ComplaintDraft } from '@/lib/complaints';

export interface AreaChoice {
  code: string;
  label: string;
  depth: number;
}

/**
 * Describe the problem to the intake assistant; it asks follow-up questions and drafts the
 * complaint. The citizen picks the area, edits the draft and files it. Nothing is sent to staff
 * until they press "File complaint".
 */
export function IntakeChat({ areas, defaultArea }: { areas: AreaChoice[]; defaultArea: string }) {
  const t = useTranslations('complaints.new');
  const tc = useTranslations('complaints');
  const locale = useLocale();
  const [turns, setTurns] = useState<ChatTurn[]>([{ role: 'assistant', text: t('greeting') }]);
  const [draft, setDraft] = useState<ComplaintDraft | null>(null);
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [filed, file, filing] = useActionState<FileState, FormData>(fileComplaint, {
    status: 'idle',
  });
  const log = useRef<HTMLDivElement>(null);
  useEffect(() => {
    log.current?.scrollTo({ top: log.current.scrollHeight, behavior: 'smooth' });
  }, [turns, pending]);

  const send = () => {
    const message = text.trim().slice(0, 1500);
    if (!message || pending) return;
    const next: ChatTurn[] = [...turns, { role: 'user', text: message }];
    setTurns(next);
    setText('');
    setError(null);
    startTransition(async () => {
      try {
        const reply = await askIntake(next.slice(1), locale);
        if (reply.status === 'ok') {
          setTurns([...next, { role: 'assistant', text: reply.text }]);
          if (reply.draft) setDraft(reply.draft);
        } else {
          setError(t(`errors.${reply.status}`));
        }
      } catch {
        setError(t('errors.unavailable'));
      }
    });
  };

  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <section aria-label={t('chatTitle')} className="card flex h-[32rem] flex-col overflow-hidden">
        <header className="bg-ink px-5 py-3 text-white">
          <h2 className="display text-lg !text-white">{t('chatTitle')}</h2>
          <p className="text-xs text-white/75">{t('chatSubtitle')}</p>
        </header>
        <div ref={log} className="flex-1 space-y-3 overflow-y-auto bg-mist p-4">
          {turns.map((turn, index) => (
            <p
              key={index}
              className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-line ${
                turn.role === 'user'
                  ? 'ml-auto bg-ink text-white'
                  : 'border border-line bg-white text-ink'
              }`}
            >
              {turn.text}
            </p>
          ))}
          <div aria-live="polite">
            {pending && <p className="text-sm text-muted">{t('thinking')}</p>}
            {error && <p className="text-sm text-danger">{error}</p>}
          </div>
        </div>
        <form
          className="flex items-end gap-2 border-t border-line bg-white p-3"
          onSubmit={(event) => {
            event.preventDefault();
            send();
          }}
        >
          <label className="sr-only" htmlFor="intake-text">
            {t('placeholder')}
          </label>
          <textarea
            id="intake-text"
            rows={2}
            maxLength={1500}
            value={text}
            placeholder={t('placeholder')}
            onChange={(event) => setText(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                send();
              }
            }}
            className="field min-h-0 flex-1 resize-none !py-2 text-sm"
          />
          <button
            type="submit"
            className="btn btn-primary btn-sm"
            disabled={pending || !text.trim()}
          >
            {t('send')}
          </button>
        </form>
      </section>

      <form action={file} className="card space-y-4 p-6" key={draft ? draft.title : 'empty'}>
        <input type="hidden" name="locale" value={locale} />
        <h2 className="text-xl">{t('draftTitle')}</h2>
        <p className="text-sm text-muted">{draft ? t('draftReady') : t('draftEmpty')}</p>
        <div>
          <label htmlFor="c-area" className="label">
            {t('area')}
          </label>
          <select id="c-area" name="area" required defaultValue={defaultArea} className="field">
            <option value="">{t('areaChoose')}</option>
            {areas.map((area) => (
              <option key={area.code} value={area.code}>
                {`${'  '.repeat(area.depth)}${area.label}`}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="c-category" className="label">
            {t('category')}
          </label>
          <select
            id="c-category"
            name="category"
            required
            defaultValue={draft?.category ?? ''}
            className="field"
          >
            <option value="">{t('categoryChoose')}</option>
            {COMPLAINT_CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {tc(`category.${category}`)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="c-title" className="label">
            {t('subject')}
          </label>
          <input
            id="c-title"
            name="title"
            required
            minLength={5}
            maxLength={140}
            defaultValue={draft?.title}
            className="field"
          />
        </div>
        <div>
          <label htmlFor="c-summary" className="label">
            {t('details')}
          </label>
          <textarea
            id="c-summary"
            name="summary"
            rows={7}
            required
            minLength={10}
            maxLength={4000}
            defaultValue={draft?.summary}
            className="field"
          />
        </div>
        {filed.status === 'error' && filed.message && (
          <p role="alert" className="font-semibold text-danger">
            {t(`errors.${filed.message}`)}
          </p>
        )}
        <button type="submit" className="btn btn-primary w-full" disabled={filing}>
          {t('file')}
        </button>
        <p className="text-xs text-muted">{t('fileNote')}</p>
      </form>
    </div>
  );
}
