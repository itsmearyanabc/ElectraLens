'use client';

import {
  hashDocument,
  inclusionProof,
  jcsBytes,
  leafHash,
  merkleRoot,
  toHex,
  verifyInclusion,
  type Json,
} from '@electralens/canon';
import { useTranslations } from 'next-intl';
import { useEffect, useMemo, useState } from 'react';

// B10.05 / FR-INT-6: a local copy of a synthetic publication's aggregates. Edits never leave the
// browser; the point is to show that any change breaks the published hash and is localised.

interface AggregateRow {
  area_code: string;
  level: string;
  metric: string;
  dims: Record<string, string>;
  value: number | null;
  suppressed: boolean;
}

interface AggregatesDoc {
  rows: AggregateRow[];
  [key: string]: unknown;
}

const NO_SALT = new Uint8Array();
const leavesOf = (rows: AggregateRow[]) =>
  rows.map((row) => leafHash(NO_SALT, jcsBytes(row as unknown as Json)));
const SHOWN = 12;

export function TamperDemo({ url, expectedHash }: { url: string; expectedHash: string }) {
  const t = useTranslations('tamperClient');
  const [original, setOriginal] = useState<AggregatesDoc | null>(null);
  const [rows, setRows] = useState<AggregateRow[]>([]);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch(url, { cache: 'no-store' })
      .then((response) =>
        response.ok ? response.json() : Promise.reject(new Error(String(response.status))),
      )
      .then((doc: AggregatesDoc) => {
        if (cancelled) return;
        setOriginal(doc);
        setRows(doc.rows.map((row) => ({ ...row })));
      })
      .catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
    };
  }, [url]);

  const originalLeaves = useMemo(() => (original ? leavesOf(original.rows) : []), [original]);
  const originalRoot = useMemo(
    () => (originalLeaves.length ? toHex(merkleRoot(originalLeaves)) : ''),
    [originalLeaves],
  );

  const result = useMemo(() => {
    if (!original) return null;
    const leaves = leavesOf(rows);
    const root = toHex(merkleRoot(leaves));
    const fileHash = hashDocument({ ...original, rows } as unknown as Json);
    const changed = leaves.flatMap((leaf, index) =>
      toHex(leaf) === toHex(originalLeaves[index] as Uint8Array) ? [] : [index],
    );
    const first = changed[0];
    const proofHolds =
      first === undefined
        ? true
        : verifyInclusion(
            leaves[first] as Uint8Array,
            first,
            leaves.length,
            inclusionProof(first, originalLeaves),
            merkleRoot(originalLeaves),
          );
    return { root, fileHash, changed, proofHolds };
  }, [original, rows, originalLeaves]);

  if (failed) return <p className="text-danger">{t('loadFailed')}</p>;
  if (!original || !result)
    return (
      <p className="text-muted" role="status">
        {t('loading')}
      </p>
    );

  const tampered = result.changed.length > 0;
  const fileMatches = result.fileHash === expectedHash;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <div
          role="status"
          aria-live="polite"
          className={`rounded-[var(--radius-card)] border-2 p-5 ${fileMatches ? 'border-blue bg-blue-tint' : 'border-danger bg-danger-tint'}`}
        >
          <p className="text-sm font-bold tracking-wide text-muted uppercase">{t('fileHash')}</p>
          <p className={`mt-1 text-2xl font-bold ${fileMatches ? 'text-navy' : 'text-danger'}`}>
            {fileMatches ? t('match') : t('mismatch')}
          </p>
          <p className="mt-2 text-sm">{t('anchored')}</p>
          <code className="hash">{expectedHash}</code>
          <p className="mt-2 text-sm">{t('yours')}</p>
          <code className="hash">{result.fileHash}</code>
        </div>
        <div
          className={`rounded-[var(--radius-card)] border-2 p-5 ${tampered ? 'border-saffron bg-saffron-tint' : 'border-line bg-white'}`}
        >
          <p className="text-sm font-bold tracking-wide text-muted uppercase">{t('merkle')}</p>
          <p className="mt-1 text-2xl font-bold text-navy">
            {tampered ? t('changedRows', { count: result.changed.length }) : t('noChanges')}
          </p>
          <p className="mt-2 text-sm">{t('originalRoot')}</p>
          <code className="hash">{originalRoot}</code>
          <p className="mt-2 text-sm">{t('yourRoot')}</p>
          <code className="hash">{result.root}</code>
          {tampered && result.changed[0] !== undefined && (
            <p className="mt-3 text-sm font-semibold text-orange-deep">
              {t('firstChange', {
                row: result.changed[0] + 1,
                area: rows[result.changed[0]]?.area_code ?? '',
                metric: rows[result.changed[0]]?.metric ?? '',
              })}{' '}
              {result.proofHolds ? '' : t('proofFails')}
            </p>
          )}
        </div>
      </div>

      <div className="card overflow-x-auto p-5">
        <p className="mb-3 text-sm text-muted">
          {t('editHelp', { shown: SHOWN, total: rows.length })}
        </p>
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-line text-navy">
              <th scope="col" className="py-2 pr-3">
                #
              </th>
              <th scope="col" className="py-2 pr-3">
                {t('area')}
              </th>
              <th scope="col" className="py-2 pr-3">
                {t('metric')}
              </th>
              <th scope="col" className="py-2 pr-3">
                {t('value')}
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.slice(0, SHOWN).map((row, index) => {
              const changed = result.changed.includes(index);
              return (
                <tr
                  key={index}
                  className={`border-b border-line/70 ${changed ? 'bg-saffron-tint' : ''}`}
                >
                  <td className="py-1.5 pr-3 tabular-nums">{index + 1}</td>
                  <td className="py-1.5 pr-3 font-mono">{row.area_code}</td>
                  <td className="py-1.5 pr-3">
                    {row.metric}
                    {Object.keys(row.dims).length > 0 && (
                      <span className="text-muted"> ({Object.values(row.dims).join(', ')})</span>
                    )}
                  </td>
                  <td className="py-1.5 pr-3">
                    <label className="sr-only" htmlFor={`v-${index}`}>
                      {t('valueFor', { area: row.area_code, metric: row.metric })}
                    </label>
                    <input
                      id={`v-${index}`}
                      type="number"
                      inputMode="numeric"
                      disabled={row.value === null}
                      value={row.value ?? ''}
                      onChange={(event) => {
                        const next = Number(event.target.value);
                        if (!Number.isSafeInteger(next)) return;
                        setRows((current) =>
                          current.map((r, i) => (i === index ? { ...r, value: next } : r)),
                        );
                      }}
                      className="field min-h-9 w-32 py-1 tabular-nums"
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <button
          type="button"
          className="btn btn-outline mt-4"
          onClick={() => setRows(original.rows.map((row) => ({ ...row })))}
          disabled={!tampered}
        >
          {t('reset')}
        </button>
      </div>
    </div>
  );
}
