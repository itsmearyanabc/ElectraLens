'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';

import { useRouter } from '@/i18n/navigation';

// B12.03: voice input and read-aloud where the browser offers them; hidden everywhere else.

interface SpeechRecognitionLike {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  start: () => void;
  stop: () => void;
}

type RecognitionConstructor = new () => SpeechRecognitionLike;

const SPEECH_LANG: Record<string, string> = { en: 'en-IN', hi: 'hi-IN' };

function recognitionConstructor(): RecognitionConstructor | null {
  const w = window as unknown as {
    SpeechRecognition?: RecognitionConstructor;
    webkitSpeechRecognition?: RecognitionConstructor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function VoiceControls({
  text,
  options,
}: {
  text: string;
  options: { label: string; href: string }[];
}) {
  const t = useTranslations('assistantFlow');
  const locale = useLocale();
  const router = useRouter();
  const [canSpeak, setCanSpeak] = useState(false);
  const [canListen, setCanListen] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [listening, setListening] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const recognition = useRef<SpeechRecognitionLike | null>(null);

  useEffect(() => {
    setCanSpeak('speechSynthesis' in window);
    setCanListen(recognitionConstructor() !== null && options.length > 0);
    return () => {
      if ('speechSynthesis' in window) window.speechSynthesis.cancel();
      recognition.current?.stop();
    };
  }, [options.length]);

  if (!canSpeak && !canListen) return null;

  function readAloud() {
    if (speaking) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
      return;
    }
    const utterance = new SpeechSynthesisUtterance(
      [text, ...options.map((option, index) => `${index + 1}. ${option.label}`)].join('. '),
    );
    utterance.lang = SPEECH_LANG[locale] ?? 'en-IN';
    utterance.onend = () => setSpeaking(false);
    setSpeaking(true);
    window.speechSynthesis.speak(utterance);
  }

  function listen() {
    const Recognition = recognitionConstructor();
    if (!Recognition) return;
    const instance = new Recognition();
    instance.lang = SPEECH_LANG[locale] ?? 'en-IN';
    instance.interimResults = false;
    instance.maxAlternatives = 3;
    instance.onresult = (event) => {
      const heard = Array.from(event.results[0] ?? []).map((alt) => alt.transcript.toLowerCase());
      const match = options.find((option, index) =>
        heard.some(
          (phrase) =>
            phrase.includes(String(index + 1)) ||
            option.label
              .toLowerCase()
              .split(/\s+/)
              .filter((word) => word.length > 3)
              .some((word) => phrase.includes(word)),
        ),
      );
      if (match) router.push(match.href);
      else setMessage(t('notUnderstood'));
    };
    instance.onend = () => setListening(false);
    instance.onerror = () => {
      setListening(false);
      setMessage(t('notUnderstood'));
    };
    recognition.current = instance;
    setMessage(null);
    setListening(true);
    instance.start();
  }

  return (
    <div className="rounded-2xl bg-mist p-4">
      <div className="flex flex-wrap gap-2">
        {canSpeak && (
          <button
            type="button"
            onClick={readAloud}
            className="btn btn-outline btn-sm"
            aria-pressed={speaking}
          >
            {speaking ? t('stop') : t('readAloud')}
          </button>
        )}
        {canListen && (
          <button
            type="button"
            onClick={listen}
            disabled={listening}
            className="btn btn-outline btn-sm"
          >
            {listening ? t('listening') : t('speak')}
          </button>
        )}
      </div>
      <p className="mt-2 text-xs text-muted">{t('voicePrivacy')}</p>
      {message && (
        <p role="status" className="mt-2 text-sm font-semibold text-orange-ink">
          {message}
        </p>
      )}
    </div>
  );
}
