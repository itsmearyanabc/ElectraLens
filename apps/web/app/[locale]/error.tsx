'use client';

import { useTranslations } from 'next-intl';

// Never shows the error message or stack: only that something failed and how to retry.
export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations('errors');
  return (
    <main id="main" className="container-page flex-1 py-20">
      <p className="eyebrow">500</p>
      <h1 className="mt-2 text-4xl">{t('errorTitle')}</h1>
      <p className="mt-4 max-w-xl text-lg text-muted">{t('errorBody')}</p>
      <div className="mt-8 flex flex-wrap gap-3">
        <button type="button" onClick={reset} className="btn btn-primary">
          {t('retry')}
        </button>
        <a href="/" className="btn btn-outline">
          {t('goHome')}
        </a>
      </div>
    </main>
  );
}
