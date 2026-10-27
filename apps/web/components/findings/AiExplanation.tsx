'use client';

import { useState, useTransition } from 'react';

import { explainFindingAction } from '@/app/[locale]/(site)/findings/[id]/actions';
import type { Explanation } from '@/lib/ai/explainFinding';

export interface AiExplanationText {
  title: string;
  intro: string;
  button: string;
  working: string;
  badge: string;
  disclaimer: string;
  unavailable: string;
  refused: string;
}

/** On request, a Gemini-written plain-language summary of this finding, clearly labelled. */
export function AiExplanation({
  findingId,
  locale,
  text,
}: {
  findingId: string;
  locale: string;
  text: AiExplanationText;
}) {
  const [result, setResult] = useState<Explanation | null>(null);
  const [pending, startTransition] = useTransition();

  const ask = () =>
    startTransition(async () => {
      try {
        setResult(await explainFindingAction(findingId, locale));
      } catch {
        setResult({ status: 'unavailable' });
      }
    });

  return (
    <section
      aria-labelledby="ai-title"
      className="card relative max-w-3xl overflow-hidden border-t-4 border-t-blue p-6"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="ai-title" className="text-xl">
          {text.title}
        </h2>
        <span className="rounded-full bg-blue-tint px-3 py-1 font-mono text-xs font-bold text-blue-deep uppercase">
          {text.badge}
        </span>
      </div>

      {result?.status === 'ok' ? (
        <div aria-live="polite">
          <div className="mt-4 space-y-3 text-lg leading-relaxed">
            {result.text.split(/\n\s*\n/).map((paragraph, index) => (
              <p key={index}>{paragraph}</p>
            ))}
          </div>
          <p className="mt-4 text-sm text-muted">
            {text.disclaimer} <span className="font-mono">({result.model})</span>
          </p>
        </div>
      ) : (
        <div aria-live="polite">
          <p className="mt-2 text-muted">{text.intro}</p>
          {result?.status === 'refused' && <p className="mt-3 text-danger">{text.refused}</p>}
          {(result?.status === 'unavailable' || result?.status === 'not_found') && (
            <p className="mt-3 text-danger">{text.unavailable}</p>
          )}
          <button
            type="button"
            onClick={ask}
            disabled={pending}
            className="btn btn-blue mt-5 disabled:opacity-60"
          >
            {pending ? text.working : text.button}
          </button>
        </div>
      )}
    </section>
  );
}
