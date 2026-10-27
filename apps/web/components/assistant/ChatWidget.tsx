'use client';

import { useEffect, useRef, useState, useTransition } from 'react';

import { askAssistant } from '@/app/[locale]/(site)/chat-actions';
import type { ChatTurn } from '@/lib/ai/assistant';

export interface ChatWidgetText {
  open: string;
  close: string;
  title: string;
  subtitle: string;
  placeholder: string;
  send: string;
  thinking: string;
  notice: string;
  unavailable: string;
  refused: string;
  invalid: string;
  suggestions: string[];
}

const MAX_QUESTION = 500;

/** A floating help chat in the bottom-right corner. The conversation stays in this tab only. */
export function ChatWidget({ locale, text }: { locale: string; text: ChatWidgetText }) {
  const [open, setOpen] = useState(false);
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const logRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: 'smooth' });
  }, [turns, pending]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  const send = (question: string) => {
    const q = question.trim().slice(0, MAX_QUESTION);
    if (!q || pending) return;
    const next: ChatTurn[] = [...turns, { role: 'user', text: q }];
    setTurns(next);
    setDraft('');
    setError(null);
    startTransition(async () => {
      try {
        const reply = await askAssistant(next, locale);
        if (reply.status === 'ok') setTurns([...next, { role: 'assistant', text: reply.text }]);
        else setError(text[reply.status]);
      } catch {
        setError(text.unavailable);
      }
    });
  };

  return (
    <div className="fixed right-4 bottom-4 z-50 print:hidden">
      {open && (
        <section
          aria-label={text.title}
          className="card-float mb-3 flex h-[min(34rem,calc(100vh-7rem))] w-[min(24rem,calc(100vw-2rem))] flex-col overflow-hidden"
        >
          <header className="flex items-start justify-between gap-3 bg-ink px-5 py-4 text-white">
            <div>
              <h2 className="display text-lg !text-white">{text.title}</h2>
              <p className="mt-0.5 text-xs text-white/75">{text.subtitle}</p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label={text.close}
              className="rounded-full p-1.5 text-white/80 hover:bg-white/10 hover:text-white"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  d="M6 6l12 12M18 6L6 18"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </header>

          <div ref={logRef} className="flex-1 space-y-3 overflow-y-auto bg-mist px-4 py-4">
            {turns.length === 0 && (
              <div className="space-y-2">
                <p className="text-sm text-muted">{text.notice}</p>
                <ul className="flex flex-col gap-2">
                  {text.suggestions.map((suggestion) => (
                    <li key={suggestion}>
                      <button
                        type="button"
                        onClick={() => send(suggestion)}
                        className="w-full rounded-2xl border border-line bg-white px-3 py-2 text-left text-sm font-semibold text-ink hover:border-ink"
                      >
                        {suggestion}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
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
              {pending && <p className="text-sm text-muted">{text.thinking}</p>}
              {error && <p className="text-sm text-danger">{error}</p>}
            </div>
          </div>

          <form
            className="flex items-end gap-2 border-t border-line bg-white p-3"
            onSubmit={(event) => {
              event.preventDefault();
              send(draft);
            }}
          >
            <label className="sr-only" htmlFor="chat-question">
              {text.placeholder}
            </label>
            <textarea
              id="chat-question"
              ref={inputRef}
              rows={2}
              maxLength={MAX_QUESTION}
              value={draft}
              placeholder={text.placeholder}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault();
                  send(draft);
                }
              }}
              className="field min-h-0 flex-1 resize-none !py-2 text-sm"
            />
            <button
              type="submit"
              disabled={pending || !draft.trim()}
              className="btn btn-primary btn-sm disabled:opacity-50"
            >
              {text.send}
            </button>
          </form>
        </section>
      )}

      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="btn btn-primary ml-auto flex !min-h-14 items-center gap-2 !rounded-full !px-5 shadow-lg"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M4 5h16v11H8l-4 4z"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinejoin="round"
          />
        </svg>
        {open ? text.close : text.open}
      </button>
    </div>
  );
}
