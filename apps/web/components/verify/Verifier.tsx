'use client';

import { hashDocument, type Json } from '@electralens/canon';
import type { ManifestV1 } from '@electralens/schemas';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useState } from 'react';

// B10.01–B10.03: everything here runs in the visitor's browser against public sources only.

export type StepState =
  'waiting' | 'running' | 'match' | 'mismatch' | 'pending' | 'unavailable' | 'skipped';
export type Verdict =
  'checking' | 'MATCH' | 'MISMATCH' | 'ANCHOR_PENDING' | 'RETRACTED' | 'NETWORK_UNAVAILABLE';

export interface VerifierProps {
  publication: {
    seriesId: string;
    sequence: number;
    manifestHash: string;
    retracted: boolean;
  };
  artifacts: { manifest: string; report: string | null; aggregates: string | null };
  chain: {
    rpcUrl: string | null;
    registryAddress: string | null;
    explorerUrl: string;
    anchorStatus: string | null;
    txHash: string | null;
  };
}

interface Step {
  state: StepState;
  detail?: string;
}

type StepKey = 'manifest' | 'report' | 'aggregates' | 'chain';
const STEPS: StepKey[] = ['manifest', 'report', 'aggregates', 'chain'];

async function sha256Hex(bytes: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function download(url: string): Promise<ArrayBuffer> {
  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.arrayBuffer();
}

const REGISTRY_ABI = [
  'function entry(bytes32 seriesId, uint256 sequence) view returns (tuple(bytes32 manifestHash, bytes32 previous, uint64 timestamp, address publisher))',
];

export function Verifier({ publication, artifacts, chain }: VerifierProps) {
  const t = useTranslations('verifyClient');
  const [steps, setSteps] = useState<Record<StepKey, Step>>({
    manifest: { state: 'waiting' },
    report: { state: 'waiting' },
    aggregates: { state: 'waiting' },
    chain: { state: 'waiting' },
  });
  const [anchoredAt, setAnchoredAt] = useState<string | null>(null);
  const [running, setRunning] = useState(false);

  const set = (key: StepKey, step: Step) => setSteps((current) => ({ ...current, [key]: step }));

  const run = useCallback(async () => {
    setRunning(true);
    setAnchoredAt(null);
    for (const key of STEPS) set(key, { state: 'waiting' });

    // 1. The manifest: its canonical hash must equal the published (anchored) hash.
    let manifest: ManifestV1 | null = null;
    set('manifest', { state: 'running' });
    try {
      const bytes = await download(artifacts.manifest);
      manifest = JSON.parse(new TextDecoder().decode(bytes)) as ManifestV1;
      const computed = hashDocument(manifest as unknown as Json);
      set('manifest', {
        state: computed === publication.manifestHash ? 'match' : 'mismatch',
        detail: computed,
      });
    } catch {
      set('manifest', { state: 'unavailable' });
    }

    // 2–3. Every file the manifest lists must hash to the value inside it.
    for (const [key, url, expected] of [
      ['report', artifacts.report, manifest?.report_hash],
      ['aggregates', artifacts.aggregates, manifest?.aggregates_hash],
    ] as const) {
      if (!url || !expected) {
        set(key, { state: 'skipped' });
        continue;
      }
      set(key, { state: 'running' });
      try {
        const computed = await sha256Hex(await download(url));
        set(key, { state: computed === expected ? 'match' : 'mismatch', detail: computed });
      } catch {
        set(key, { state: 'unavailable' });
      }
    }

    // 4. The registry, read straight from a public RPC: never through our servers.
    if (!chain.registryAddress || !chain.rpcUrl || chain.anchorStatus !== 'confirmed') {
      set('chain', { state: 'pending' });
    } else {
      set('chain', { state: 'running' });
      try {
        const { Contract, JsonRpcProvider, id } = await import('ethers');
        const provider = new JsonRpcProvider(chain.rpcUrl, undefined, { staticNetwork: true });
        const registry = new Contract(chain.registryAddress, REGISTRY_ABI, provider);
        const entry = (await registry.getFunction('entry')(
          id(publication.seriesId),
          BigInt(publication.sequence),
        )) as { manifestHash: string; timestamp: bigint };
        const onChain = entry.manifestHash.slice(2).toLowerCase();
        setAnchoredAt(new Date(Number(entry.timestamp) * 1000).toISOString());
        set('chain', {
          state: onChain === publication.manifestHash ? 'match' : 'mismatch',
          detail: onChain,
        });
      } catch {
        set('chain', { state: 'unavailable' });
      }
    }
    setRunning(false);
  }, [artifacts, chain, publication]);

  useEffect(() => {
    void run();
  }, [run]);

  const states = STEPS.map((key) => steps[key].state);
  const verdict: Verdict = running
    ? 'checking'
    : states.includes('mismatch')
      ? 'MISMATCH'
      : publication.retracted
        ? 'RETRACTED'
        : states.includes('unavailable')
          ? 'NETWORK_UNAVAILABLE'
          : steps.chain.state === 'pending'
            ? 'ANCHOR_PENDING'
            : 'MATCH';

  const verdictStyle: Record<Verdict, string> = {
    checking: 'border-line bg-mist text-navy',
    MATCH: 'border-blue bg-blue-tint text-navy',
    MISMATCH: 'border-danger bg-danger-tint text-danger',
    ANCHOR_PENDING: 'border-saffron bg-saffron-tint text-orange-deep',
    RETRACTED: 'border-danger bg-danger-tint text-danger',
    NETWORK_UNAVAILABLE: 'border-line bg-mist text-muted',
  };

  return (
    <div className="space-y-6">
      <div
        role="status"
        aria-live="polite"
        className={`rounded-[var(--radius-card)] border-2 p-6 ${verdictStyle[verdict]}`}
      >
        <p className="text-sm font-bold tracking-wide uppercase">{t('result')}</p>
        <p className="mt-1 text-3xl font-bold">{t(`verdict.${verdict}`)}</p>
        <p className="mt-2 text-ink">{t(`verdictHelp.${verdict}`)}</p>
      </div>

      <ol className="space-y-3">
        {STEPS.map((key, index) => {
          const step = steps[key];
          return (
            <li
              key={key}
              className="card flex flex-col gap-2 p-5 sm:flex-row sm:items-start sm:gap-4"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-navy font-bold text-white">
                {index + 1}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold text-navy">{t(`step.${key}`)}</p>
                  <StateBadge state={step.state} label={t(`state.${step.state}`)} />
                </div>
                <p className="mt-1 text-sm text-muted">{t(`stepHelp.${key}`)}</p>
                {step.detail && (
                  <p className="mt-2 text-sm">
                    <span className="font-semibold text-muted">{t('computed')} </span>
                    <code className="hash">{step.detail}</code>
                  </p>
                )}
                {key === 'chain' && anchoredAt && (
                  <p className="mt-1 text-sm text-muted">
                    {t('anchoredAt', { date: new Date(anchoredAt).toLocaleString() })}
                  </p>
                )}
                {key === 'chain' && chain.txHash && (
                  <a
                    href={`${chain.explorerUrl}/tx/${chain.txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 inline-block text-sm font-semibold"
                  >
                    {t('explorer')} ↗
                  </a>
                )}
              </div>
            </li>
          );
        })}
      </ol>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => void run()}
          disabled={running}
          className="btn btn-primary"
        >
          {running ? t('running') : t('runAgain')}
        </button>
        <p className="text-sm text-muted">
          {t('expected')} <code className="hash">{publication.manifestHash}</code>
        </p>
      </div>
    </div>
  );
}

function StateBadge({ state, label }: { state: StepState; label: string }) {
  const style: Record<StepState, string> = {
    waiting: 'bg-mist text-muted ring-1 ring-line',
    running: 'bg-blue-tint text-blue ring-1 ring-blue/30',
    match: 'bg-navy text-white',
    mismatch: 'bg-danger text-white',
    pending: 'bg-saffron-tint text-orange-deep ring-1 ring-saffron/60',
    unavailable: 'bg-mist text-muted ring-1 ring-line',
    skipped: 'bg-mist text-muted ring-1 ring-line',
  };
  const icon: Partial<Record<StepState, string>> = { match: '✓', mismatch: '✕', pending: '…' };
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-sm font-semibold ${style[state]}`}
    >
      {icon[state] && <span aria-hidden="true">{icon[state]}</span>}
      {label}
    </span>
  );
}
