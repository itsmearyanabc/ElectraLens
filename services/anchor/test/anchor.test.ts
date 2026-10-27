import { describe, expect, it } from 'vitest';

import {
  AnchorRefused,
  anchorPublication,
  reconcile,
  SingleFlight,
  type AnchorDeps,
} from '../src/anchor.ts';
import { seriesIdOf, toBytes32 } from '../src/chain.ts';
import { checkPublication } from '../src/checks.ts';
import { approvedPublication, FakeChain, FakeStore } from './fakes.ts';

function setup() {
  const store = new FakeStore();
  const chain = new FakeChain();
  const deps: AnchorDeps = { store, chain, deployBlock: 0 };
  return { store, chain, deps };
}

async function reasonOf(promise: Promise<unknown>): Promise<string> {
  try {
    await promise;
  } catch (error) {
    if (error instanceof AnchorRefused) return error.reason;
    throw error;
  }
  return 'ok';
}

describe('checkPublication', () => {
  it('accepts an approved publication with two different approvers', () => {
    expect(checkPublication(approvedPublication()).ok).toBe(true);
  });

  it.each([
    [
      'not approved',
      (p: ReturnType<typeof approvedPublication>) => void (p.status = 'in_review'),
      'not_approved',
    ],
    [
      'manifest edited after approval',
      (p: ReturnType<typeof approvedPublication>) => {
        (p.manifest as { publisher: string }).publisher = 'someone else';
      },
      'hash_mismatch',
    ],
    [
      'stored hash swapped',
      (p: ReturnType<typeof approvedPublication>) => void (p.manifest_hash = 'f'.repeat(64)),
      'hash_mismatch',
    ],
    [
      'wrong sequence',
      (p: ReturnType<typeof approvedPublication>) => void (p.sequence = 2),
      'manifest_mismatch',
    ],
    [
      'one approval only',
      (p: ReturnType<typeof approvedPublication>) => void p.approvals.pop(),
      'missing_approvals',
    ],
    [
      'same person twice',
      (p: ReturnType<typeof approvedPublication>) => {
        for (const a of p.approvals) a.approver_id = 'dual';
      },
      'same_approver',
    ],
    [
      'run creator approved',
      (p: ReturnType<typeof approvedPublication>) => {
        p.run_created_by = 'reviewer';
      },
      'run_creator_approved',
    ],
    [
      'approval for an older manifest',
      (p: ReturnType<typeof approvedPublication>) => {
        for (const a of p.approvals) a.manifest_hash = 'e'.repeat(64);
      },
      'missing_approvals',
    ],
    [
      'invalid manifest',
      (p: ReturnType<typeof approvedPublication>) => void (p.manifest = { schema: 'x' }),
      'invalid_manifest',
    ],
  ])('refuses: %s', (_label, mutate, reason) => {
    const p = approvedPublication();
    mutate(p);
    expect(checkPublication(p)).toEqual({ ok: false, reason });
  });
});

describe('anchorPublication', () => {
  it('anchors, records the receipt, and chains the next publication', async () => {
    const { store, chain, deps } = setup();
    const first = approvedPublication(1);
    store.publications.set(first.id, first);
    const outcome = await anchorPublication(deps, first.id);
    expect(outcome).toMatchObject({
      sequence: 1,
      recovered: false,
      manifestHash: first.manifest_hash,
    });
    expect(store.publications.get(first.id)?.status).toBe('published');
    expect(await chain.latest(seriesIdOf('DEMO-HR'))).toBe(
      toBytes32(first.manifest_hash as string),
    );

    const second = approvedPublication(2, first.manifest_hash);
    store.publications.set(second.id, second);
    expect((await anchorPublication(deps, second.id)).sequence).toBe(2);
  });

  it('refuses and records a security event when checks fail', async () => {
    const { store, deps } = setup();
    const p = approvedPublication();
    p.approvals.pop();
    store.publications.set(p.id, p);
    expect(await reasonOf(anchorPublication(deps, p.id))).toBe('missing_approvals');
    expect(store.securityEvents).toEqual([
      { type: 'anchor.refused', details: { publication_id: p.id, reason: 'missing_approvals' } },
    ]);
  });

  it('refuses an unknown publication', async () => {
    const { deps } = setup();
    expect(await reasonOf(anchorPublication(deps, '00000000-0000-4000-8000-00000000ffff'))).toBe(
      'not_found',
    );
  });

  it('refuses when the chain and the manifest disagree on sequence or previous hash', async () => {
    const { store, deps } = setup();
    const skipped = approvedPublication(2, 'a'.repeat(64));
    store.publications.set(skipped.id, skipped);
    expect(await reasonOf(anchorPublication(deps, skipped.id))).toBe('sequence_mismatch');

    const first = approvedPublication(1);
    store.publications.set(first.id, first);
    await anchorPublication(deps, first.id);
    const wrongPrevious = approvedPublication(2, 'b'.repeat(64));
    store.publications.set(wrongPrevious.id, wrongPrevious);
    expect(await reasonOf(anchorPublication(deps, wrongPrevious.id))).toBe(
      'chain_previous_mismatch',
    );
  });

  it('recovers when the transaction confirmed but the database update failed', async () => {
    const { store, chain, deps } = setup();
    const p = approvedPublication();
    store.publications.set(p.id, p);
    store.failNextMark = true;
    await expect(anchorPublication(deps, p.id)).rejects.toThrow('database unavailable');
    expect(chain.events).toHaveLength(1);
    const retry = await anchorPublication(deps, p.id);
    expect(retry.recovered).toBe(true);
    expect(chain.events).toHaveLength(1); // no second transaction
    expect(store.publications.get(p.id)?.status).toBe('published');
  });

  it('can be retried after an RPC failure', async () => {
    const { store, chain, deps } = setup();
    const p = approvedPublication();
    store.publications.set(p.id, p);
    chain.failNextAnchor = true;
    await expect(anchorPublication(deps, p.id)).rejects.toThrow('rpc unavailable');
    expect((await anchorPublication(deps, p.id)).recovered).toBe(false);
  });
});

describe('SingleFlight', () => {
  it('runs tasks one at a time, in order, even when one fails', async () => {
    const queue = new SingleFlight();
    const log: string[] = [];
    const task =
      (name: string, fail = false) =>
      async () => {
        log.push(`start ${name}`);
        await new Promise((resolve) => setTimeout(resolve, 5));
        log.push(`end ${name}`);
        if (fail) throw new Error(name);
        return name;
      };
    const results = await Promise.allSettled([
      queue.run(task('a')),
      queue.run(task('b', true)),
      queue.run(task('c')),
    ]);
    expect(log).toEqual(['start a', 'end a', 'start b', 'end b', 'start c', 'end c']);
    expect(results.map((r) => r.status)).toEqual(['fulfilled', 'rejected', 'fulfilled']);
  });
});

describe('reconcile', () => {
  it('flags anchors the database does not know and a low balance', async () => {
    const { store, chain, deps } = setup();
    const known = approvedPublication();
    store.publications.set(known.id, known);
    await anchorPublication(deps, known.id);
    await chain.anchor(
      seriesIdOf('DEMO-RJ'),
      toBytes32('c'.repeat(64)),
      await chain.latest(seriesIdOf('DEMO-RJ')),
    );
    chain.balance = 1n;

    const result = await reconcile(deps, 10n ** 16n);
    expect(result.events).toBe(2);
    expect(result.orphans.map((o) => o.manifestHash)).toEqual([toBytes32('c'.repeat(64))]);
    expect(result.lowBalance).toBe(true);
    expect(store.securityEvents.map((e) => e.type)).toEqual([
      'chain.orphan_anchor',
      'anchor.low_balance',
    ]);
  });

  it('flags a retraction the database did not record, and accepts one it did', async () => {
    const { store, chain, deps } = setup();
    const kept = approvedPublication(1);
    const withdrawn = approvedPublication(1, null, 'DEMO-RJ');
    for (const p of [kept, withdrawn]) {
      store.publications.set(p.id, p);
      await anchorPublication(deps, p.id);
    }
    withdrawn.status = 'retracted';
    chain.retract(seriesIdOf('DEMO-RJ'), toBytes32(withdrawn.manifest_hash as string));
    chain.retract(seriesIdOf('DEMO-HR'), toBytes32(kept.manifest_hash as string));

    const result = await reconcile(deps, 0n);
    expect(result.orphans).toEqual([]);
    expect(result.unexpectedRetractions.map((r) => r.manifestHash)).toEqual([
      toBytes32(kept.manifest_hash as string),
    ]);
    expect(store.securityEvents).toEqual([
      {
        type: 'chain.unexpected_retraction',
        details: expect.objectContaining({ manifest_hash: kept.manifest_hash }),
      },
    ]);
  });
});
