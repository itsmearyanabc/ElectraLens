'use client';

import { useEffect, useRef, useState, useTransition } from 'react';

import { askAssistant } from '@/app/[locale]/(site)/chat-actions';
import type { ChatTurn } from '@/lib/ai/assistant';

import { useVoice, type VoiceError } from './useVoice';

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
  talk: string;
  stopTalk: string;
  mic: string;
  listening: string;
  speaking: string;
  stopSpeaking: string;
  replay: string;
  voiceNote: string;
  voiceDenied: string;
  voiceNoSpeech: string;
  voiceFailed: string;
}

const MAX_QUESTION = 500;

function MicIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" fill="none">
      <rect x="9" y="3" width="6" height="11" rx="3" stroke="currentColor" strokeWidth="2" />
      <path
        d="M5 11a7 7 0 0 0 14 0M12 18v3"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function SpeakerIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" fill="none">
      <path
        d="M4 9h4l5-4v14l-5-4H4z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M17 9a4 4 0 0 1 0 6M19.5 6.5a8 8 0 0 1 0 11"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

/**
 * A floating help chat in the bottom-right corner, by typing or by voice. "Talk" starts a
 * hands-free conversation: it listens, answers aloud, then listens again until stopped. The
 * conversation stays in this tab only.
 */
export function ChatWidget({ locale, text }: { locale: string; text: ChatWidgetText }) {
  const [open, setOpen] = useState(false);
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [talking, setTalking] = useState(false);
  const talkingRef = useRef(false);
  const turnsRef = useRef<ChatTurn[]>([]);
  const logRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const voice = useVoice(locale);

  useEffect(() => {
    turnsRef.current = turns;
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: 'smooth' });
  }, [turns, pending]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  const voiceErrorText = (e: VoiceError) =>
    e === 'denied' ? text.voiceDenied : e === 'no-speech' ? text.voiceNoSpeech : text.voiceFailed;

  const stopTalking = () => {
    talkingRef.current = false;
    setTalking(false);
    voice.stopListening();
    voice.stopSpeaking();
  };

  const listenOnce = () => {
    setError(null);
    voice.listen({
      onInterim: (words) => setDraft(words),
      onFinal: (words) => send(words, true),
      onError: (e) => {
        setError(voiceErrorText(e));
        // A quiet moment in a conversation is not a reason to hang up; anything else is.
        if (e !== 'no-speech') stopTalking();
        else if (talkingRef.current) setTimeout(listenOnce, 400);
      },
    });
  };

  const send = (question: string, spoken = false) => {
    const q = question.trim().slice(0, MAX_QUESTION);
    if (!q) return;
    const next: ChatTurn[] = [...turnsRef.current, { role: 'user', text: q }];
    setTurns(next);
    setDraft('');
    setError(null);
    startTransition(async () => {
      try {
        const reply = await askAssistant(next, locale);
        if (reply.status === 'ok') {
          setTurns([...next, { role: 'assistant', text: reply.text }]);
          if (spoken || talkingRef.current) {
            voice.speak(reply.text, () => {
              if (talkingRef.current) listenOnce();
            });
          }
        } else {
          setError(text[reply.status]);
          if (talkingRef.current) voice.speak(text[reply.status], () => stopTalking());
        }
      } catch {
        setError(text.unavailable);
        stopTalking();
      }
    });
  };

  const startTalking = () => {
    talkingRef.current = true;
    setTalking(true);
    listenOnce();
  };

  const close = () => {
    stopTalking();
    setOpen(false);
  };

  return (
    <div className="fixed right-4 bottom-4 z-50 print:hidden">
      {open && (
        <section
          aria-label={text.title}
          className="card-float mb-3 flex h-[min(36rem,calc(100vh-7rem))] w-[min(24rem,calc(100vw-2rem))] flex-col overflow-hidden"
        >
          <header className="flex items-start justify-between gap-3 bg-ink px-5 py-4 text-white">
            <div>
              <h2 className="display text-lg !text-white">{text.title}</h2>
              <p className="mt-0.5 text-xs text-white/75">{text.subtitle}</p>
            </div>
            <div className="flex items-center gap-1">
              {voice.canListen && voice.canSpeak && (
                <button
                  type="button"
                  onClick={talking ? stopTalking : startTalking}
                  aria-pressed={talking}
                  className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold ${
                    talking ? 'bg-saffron text-ink' : 'bg-white/10 text-white hover:bg-white/20'
                  }`}
                >
                  <MicIcon size={14} />
                  {talking ? text.stopTalk : text.talk}
                </button>
              )}
              <button
                type="button"
                onClick={close}
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
            </div>
          </header>

          <div ref={logRef} className="flex-1 space-y-3 overflow-y-auto bg-mist px-4 py-4">
            {turns.length === 0 && (
              <div className="space-y-2">
                <p className="text-sm text-muted">{text.notice}</p>
                {voice.canListen && <p className="text-sm text-muted">{text.voiceNote}</p>}
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
            {turns.map((turn, index) =>
              turn.role === 'user' ? (
                <p
                  key={index}
                  className="ml-auto max-w-[88%] rounded-2xl bg-ink px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-line text-white"
                >
                  {turn.text}
                </p>
              ) : (
                <div
                  key={index}
                  className="max-w-[88%] rounded-2xl border border-line bg-white px-3.5 py-2.5 text-sm leading-relaxed text-ink"
                >
                  <p className="whitespace-pre-line">{turn.text}</p>
                  {voice.canSpeak && (
                    <button
                      type="button"
                      onClick={() => voice.speak(turn.text)}
                      className="mt-1.5 flex items-center gap-1 text-xs font-bold text-blue hover:text-blue-deep"
                    >
                      <SpeakerIcon />
                      {text.replay}
                    </button>
                  )}
                </div>
              ),
            )}
            <div aria-live="polite" className="space-y-1">
              {voice.listening && (
                <p className="flex items-center gap-2 text-sm font-semibold text-saffron">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-saffron" />
                  {text.listening}
                </p>
              )}
              {pending && <p className="text-sm text-muted">{text.thinking}</p>}
              {voice.speaking && (
                <p className="flex items-center gap-2 text-sm font-semibold text-blue">
                  <SpeakerIcon />
                  {text.speaking}
                  <button
                    type="button"
                    onClick={voice.stopSpeaking}
                    className="ml-auto text-xs underline"
                  >
                    {text.stopSpeaking}
                  </button>
                </p>
              )}
              {error && <p className="text-sm text-danger">{error}</p>}
            </div>
          </div>

          <form
            className="flex items-end gap-2 border-t border-line bg-white p-3"
            onSubmit={(event) => {
              event.preventDefault();
              if (!pending) send(draft);
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
                  if (!pending) send(draft);
                }
              }}
              className="field min-h-0 flex-1 resize-none !py-2 text-sm"
            />
            {voice.canListen && (
              <button
                type="button"
                onClick={voice.listening ? voice.stopListening : listenOnce}
                aria-label={text.mic}
                aria-pressed={voice.listening}
                disabled={pending}
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border ${
                  voice.listening
                    ? 'animate-pulse border-saffron bg-saffron text-ink'
                    : 'border-line bg-white text-ink hover:border-ink'
                }`}
              >
                <MicIcon />
              </button>
            )}
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
        onClick={() => (open ? close() : setOpen(true))}
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
