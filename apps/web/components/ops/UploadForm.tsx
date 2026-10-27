'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { confirmUpload, requestUpload } from '@/app/[locale]/ops/upload-actions';
import { useRouter } from '@/i18n/navigation';

type State = 'idle' | 'uploading' | 'done' | 'error';

/** Uploads a CSV straight from the browser to the signed quarantine URL; the web server never holds the file. */
export function UploadForm({ versionId }: { versionId: string }) {
  const t = useTranslations('ops');
  const router = useRouter();
  const [state, setState] = useState<State>('idle');
  const [error, setError] = useState<string | null>(null);

  async function upload(file: File | undefined) {
    if (!file) return;
    setState('uploading');
    setError(null);
    const ticket = await requestUpload(versionId);
    if ('error' in ticket) {
      setState('error');
      setError(ticket.error);
      return;
    }
    if (file.size > ticket.max_bytes) {
      setState('error');
      setError('too_large');
      return;
    }
    const response = await fetch(ticket.signed_url, {
      method: 'PUT',
      headers: { 'content-type': 'text/csv' },
      body: file,
    });
    if (!response.ok) {
      setState('error');
      setError('storage');
      return;
    }
    const confirmed = await confirmUpload(versionId, ticket.path);
    if (confirmed.error) {
      setState('error');
      setError(confirmed.error);
      return;
    }
    setState('done');
    router.refresh();
  }

  return (
    <div className="space-y-3">
      <label htmlFor="roll-file" className="label">
        {t('datasets.upload')}
      </label>
      <input
        id="roll-file"
        type="file"
        accept=".csv,text/csv"
        disabled={state === 'uploading'}
        onChange={(event) => void upload(event.target.files?.[0])}
        className="block w-full text-sm file:mr-3 file:rounded-full file:border-0 file:bg-saffron file:px-5 file:py-2 file:font-bold file:text-ink"
      />
      <p role="status" className="text-sm">
        {state === 'uploading' && <span className="text-muted">{t('datasets.uploading')}</span>}
        {state === 'done' && (
          <span className="font-semibold text-blue">{t('datasets.uploaded')}</span>
        )}
        {state === 'error' && (
          <span className="font-semibold text-danger">
            {t('datasets.uploadFailed')} ({error})
          </span>
        )}
      </p>
    </div>
  );
}
