'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

// Browser speech: SpeechRecognition to listen, speechSynthesis to talk. No API key and nothing
// stored by ElectraLens; in Chrome and Edge the recognition itself runs on the browser maker's
// speech service. Where the browser lacks either, that half is simply unavailable.

interface Alternative {
  transcript: string;
}
interface RecognitionResult {
  isFinal: boolean;
  0: Alternative;
}
interface RecognitionEvent {
  resultIndex: number;
  results: ArrayLike<RecognitionResult>;
}
interface Recognition {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  maxAlternatives: number;
  onresult: ((event: RecognitionEvent) => void) | null;
  onend: (() => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}
type RecognitionConstructor = new () => Recognition;

const SPEECH_LANG: Record<string, string> = { en: 'en-IN', hi: 'hi-IN' };

function recognitionConstructor(): RecognitionConstructor | null {
  const w = window as unknown as {
    SpeechRecognition?: RecognitionConstructor;
    webkitSpeechRecognition?: RecognitionConstructor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

/** Text as it should be read aloud: no list markers, symbols or bare page paths. */
export function speakable(text: string): string {
  return text
    .replace(/^\s*[-*•]\s+/gm, '')
    .replace(/[#*_`>]/g, '')
    .replace(/\s\/([a-z-]+)(?=[\s.,)]|$)/g, ' the $1 page')
    .replace(/https?:\/\/\S+/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export type VoiceError = 'denied' | 'no-speech' | 'failed';

export function useVoice(locale: string) {
  const [canListen, setCanListen] = useState(false);
  const [canSpeak, setCanSpeak] = useState(false);
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const recognition = useRef<Recognition | null>(null);
  const lang = SPEECH_LANG[locale] ?? 'en-IN';

  useEffect(() => {
    // Feature detection can only happen in the browser, after mounting.
    setCanListen(recognitionConstructor() !== null);
    setCanSpeak('speechSynthesis' in window);
    return () => {
      recognition.current?.abort();
      if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    };
  }, []);

  /** Listens once: interim words as they come, then the final sentence (or an error). */
  const listen = useCallback(
    (handlers: {
      onInterim: (text: string) => void;
      onFinal: (text: string) => void;
      onError: (error: VoiceError) => void;
    }) => {
      const Ctor = recognitionConstructor();
      if (!Ctor) return;
      if ('speechSynthesis' in window) window.speechSynthesis.cancel();
      recognition.current?.abort();
      const rec = new Ctor();
      rec.lang = lang;
      rec.interimResults = true;
      rec.continuous = false;
      rec.maxAlternatives = 1;
      let final = '';
      rec.onresult = (event) => {
        let interim = '';
        for (let i = event.resultIndex; i < event.results.length; i += 1) {
          const result = event.results[i];
          if (!result) continue;
          if (result.isFinal) final += result[0].transcript;
          else interim += result[0].transcript;
        }
        handlers.onInterim((final + interim).trim());
      };
      rec.onerror = (event) => {
        handlers.onError(
          event.error === 'not-allowed' || event.error === 'service-not-allowed'
            ? 'denied'
            : event.error === 'no-speech'
              ? 'no-speech'
              : 'failed',
        );
      };
      rec.onend = () => {
        setListening(false);
        recognition.current = null;
        if (final.trim()) handlers.onFinal(final.trim());
      };
      recognition.current = rec;
      setListening(true);
      rec.start();
    },
    [lang],
  );

  const stopListening = useCallback(() => {
    recognition.current?.stop();
  }, []);

  /** Reads text aloud in the page's language, then calls onEnd. */
  const speak = useCallback(
    (text: string, onEnd?: () => void) => {
      if (!('speechSynthesis' in window)) {
        onEnd?.();
        return;
      }
      const synth = window.speechSynthesis;
      synth.cancel();
      const utterance = new SpeechSynthesisUtterance(speakable(text));
      utterance.lang = lang;
      const voice = synth
        .getVoices()
        .find((v) => v.lang.replace('_', '-').startsWith(lang.slice(0, 2)));
      if (voice) utterance.voice = voice;
      utterance.rate = 1;
      utterance.onstart = () => setSpeaking(true);
      const done = () => {
        setSpeaking(false);
        onEnd?.();
      };
      utterance.onend = done;
      utterance.onerror = done;
      synth.speak(utterance);
    },
    [lang],
  );

  const stopSpeaking = useCallback(() => {
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    setSpeaking(false);
  }, []);

  return { canListen, canSpeak, listening, speaking, listen, stopListening, speak, stopSpeaking };
}
