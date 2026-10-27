'use client';

import { useEffect, useRef } from 'react';

interface TurnstileApi {
  render: (
    container: HTMLElement,
    options: { sitekey: string; action: string; language?: string; theme?: 'light' },
  ) => string;
  remove: (widgetId: string) => void;
}

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

const SCRIPT = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
let loading: Promise<void> | null = null;

/** Loads Cloudflare's script once. The strict CSP allows it because a trusted script adds it. */
function loadScript(): Promise<void> {
  if (window.turnstile) return Promise.resolve();
  loading ??= new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = SCRIPT;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      loading = null;
      reject(new Error('turnstile script failed'));
    };
    document.head.append(script);
  });
  return loading;
}

/**
 * Cloudflare Turnstile inside a form: it adds a hidden `cf-turnstile-response` field that the
 * server checks. Renders nothing when no site key is configured (local development).
 */
export function Turnstile({
  siteKey,
  action,
  locale,
}: {
  siteKey: string | null;
  action: string;
  locale: string;
}) {
  const container = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!siteKey || !container.current) return;
    let widgetId: string | null = null;
    let cancelled = false;
    loadScript()
      .then(() => {
        if (cancelled || !container.current || !window.turnstile) return;
        widgetId = window.turnstile.render(container.current, {
          sitekey: siteKey,
          action,
          language: locale,
          theme: 'light',
        });
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
      if (widgetId && window.turnstile) window.turnstile.remove(widgetId);
    };
  }, [siteKey, action, locale]);

  if (!siteKey) return null;
  return <div ref={container} className="min-h-[65px]" />;
}
