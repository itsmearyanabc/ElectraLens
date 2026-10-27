'use client';

import { useActionState } from 'react';

import { showHistory, type HistoryState } from '@/app/[locale]/v/[code]/actions';

export interface HistoryText {
  title: string;
  intro: string;
  pin: string;
  show: string;
  wrong: string;
  locked: string;
  failed: string;
  voted: string;
  missed: string;
  summary: string;
  allVoted: string;
  synthetic: string;
}

/** The PIN box, then the card's synthetic participation history. */
export function HistoryForm({ code, text }: { code: string; text: HistoryText }) {
  const [state, action, pending] = useActionState<HistoryState, FormData>(showHistory, {
    status: 'idle',
  });

  if (state.status === 'ok') {
    const missed = state.participation.filter((p) => !p.voted).length;
    const total = state.participation.length;
    return (
      <section aria-labelledby="history-title" className="card p-6 sm:p-7">
        <h2 id="history-title" className="text-xl">
          {text.title}
        </h2>
        <p className="display mt-4 text-3xl">
          {missed === 0
            ? text.allVoted
            : text.summary.replace('{missed}', String(missed)).replace('{total}', String(total))}
        </p>
        <ol className="mt-5 divide-y divide-line border-y border-line">
          {state.participation.map((p) => (
            <li
              key={`${p.year}-${p.election}`}
              className="flex items-center justify-between gap-4 py-3"
            >
              <span>{p.election}</span>
              <span
                className={`rounded-full px-3 py-0.5 text-sm font-bold ${p.voted ? 'bg-blue-tint text-blue-deep' : 'bg-saffron-tint text-orange-deep'}`}
              >
                {p.voted ? `✓ ${text.voted}` : `✕ ${text.missed}`}
              </span>
            </li>
          ))}
        </ol>
        <p className="mt-4 text-sm text-muted">{text.synthetic}</p>
      </section>
    );
  }

  return (
    <form action={action} className="card space-y-4 p-6 sm:p-7">
      <h2 className="text-xl">{text.title}</h2>
      <p className="text-muted">{text.intro}</p>
      <input type="hidden" name="code" value={code} />
      <div>
        <label htmlFor="pin" className="label">
          {text.pin}
        </label>
        <input
          id="pin"
          name="pin"
          inputMode="numeric"
          autoComplete="off"
          pattern="[0-9]{4}"
          maxLength={4}
          required
          className="field max-w-[10rem] text-center font-mono text-2xl tracking-[0.5em]"
        />
      </div>
      {state.status !== 'idle' && (
        <p role="alert" className="font-semibold text-danger">
          {text[state.status]}
        </p>
      )}
      <button type="submit" className="btn btn-blue" disabled={pending}>
        {text.show}
      </button>
    </form>
  );
}
