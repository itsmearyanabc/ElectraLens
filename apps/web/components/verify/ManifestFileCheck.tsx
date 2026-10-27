'use client';

import { hashDocument, type Json } from '@electralens/canon';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { Link } from '@/i18n/navigation';

interface Known {
  id: string;
  label: string;
  hash: string;
}

type Result =
  | { kind: 'match'; known: Known; hash: string }
  | { kind: 'unknown'; hash: string }
  | { kind: 'invalid' };

/** Hashes a manifest the visitor already has, locally, and looks it up in the publication record. */
export function ManifestFileCheck({ known }: { known: Known[] }) {
  const t = useTranslations('verifyClient');
  const [result, setResult] = useState<Result | null>(null);

  async function check(file: File | undefined) {
    if (!file) return;
    try {
      if (file.size > 1_000_000) throw new Error('too large');
      const hash = hashDocument(JSON.parse(await file.text()) as Json);
      const match = known.find((item) => item.hash === hash);
      setResult(match ? { kind: 'match', known: match, hash } : { kind: 'unknown', hash });
    } catch {
      setResult({ kind: 'invalid' });
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <label htmlFor="manifest-file" className="label">
          {t('chooseFile')}
        </label>
        <input
          id="manifest-file"
          type="file"
          accept="application/json,.json"
          onChange={(event) => void check(event.target.files?.[0])}
          className="block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-blue file:px-4 file:py-2 file:font-semibold file:text-white"
        />
      </div>
      <div role="status" aria-live="polite">
        {result?.kind === 'match' && (
          <div className="rounded-lg border-l-4 border-blue bg-blue-tint p-4">
            <p className="font-semibold text-navy">
              {t('fileMatch', { publication: result.known.label })}
            </p>
            <Link href={`/verify/${result.known.id}`} className="mt-2 inline-block font-semibold">
              {t('verifyIt')} →
            </Link>
          </div>
        )}
        {result?.kind === 'unknown' && (
          <div className="rounded-lg border-l-4 border-danger bg-danger-tint p-4">
            <p className="font-semibold text-danger">{t('fileUnknown')}</p>
            <code className="hash mt-1 block">{result.hash}</code>
          </div>
        )}
        {result?.kind === 'invalid' && (
          <p className="font-semibold text-danger">{t('fileInvalid')}</p>
        )}
      </div>
    </div>
  );
}
