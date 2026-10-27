// Anchoring one approved publication (DF3, B08.06-B08.08) and checking the chain against the
// database (B08.09-B08.10).
import {
  fromBytes32,
  seriesIdOf,
  toBytes32,
  ZERO_HASH,
  type AnchoredEvent,
  type Chain,
  type RetractedEvent,
} from './chain.ts';
import { checkPublication, type RefusalReason } from './checks.ts';
import type { PublicationStore } from './store.ts';

export class AnchorRefused extends Error {
  readonly reason: RefusalReason;

  constructor(reason: RefusalReason) {
    super(`anchor refused: ${reason}`);
    this.name = 'AnchorRefused';
    this.reason = reason;
  }
}

export interface AnchorDeps {
  store: PublicationStore;
  chain: Chain;
  /** Block the registry was deployed in; log searches start here. */
  deployBlock: number;
}

export interface AnchorOutcome {
  publicationId: string;
  manifestHash: string;
  txHash: string;
  blockNumber: number;
  logIndex: number;
  sequence: number;
  /** True when the hash was already on-chain and only the database had to catch up. */
  recovered: boolean;
}

async function refuse(
  deps: AnchorDeps,
  publicationId: string,
  reason: RefusalReason,
): Promise<never> {
  await deps.store.recordSecurityEvent('anchor.refused', { publication_id: publicationId, reason });
  throw new AnchorRefused(reason);
}

export async function anchorPublication(
  deps: AnchorDeps,
  publicationId: string,
): Promise<AnchorOutcome> {
  const record = await deps.store.getPublication(publicationId);
  if (!record) return refuse(deps, publicationId, 'not_found');
  const check = checkPublication(record);
  if (!check.ok) return refuse(deps, publicationId, check.reason);

  const seriesId = seriesIdOf(record.series_id);
  const hash = toBytes32(check.hash);
  const outcome = (
    event: AnchoredEvent | Omit<AnchoredEvent, 'seriesId' | 'manifestHash'>,
    recovered: boolean,
  ) => ({
    publicationId,
    manifestHash: check.hash,
    txHash: event.txHash,
    blockNumber: event.blockNumber,
    logIndex: event.logIndex,
    sequence: Number(event.sequence),
    recovered,
  });

  // Already on-chain: a previous attempt confirmed but crashed before updating the database.
  if (await deps.chain.isAnchored(hash)) {
    const event = await deps.chain.findAnchor(hash, deps.deployBlock);
    if (!event) throw new Error('hash is anchored but its event was not found');
    if (event.seriesId !== seriesId) return refuse(deps, publicationId, 'anchored_in_other_series');
    await deps.store.markPublished(publicationId, event, deps.chain);
    return outcome(event, true);
  }

  if ((await deps.chain.count(seriesId)) + 1n !== BigInt(check.manifest.sequence)) {
    return refuse(deps, publicationId, 'sequence_mismatch');
  }
  const previous = check.manifest.previous_manifest_hash
    ? toBytes32(check.manifest.previous_manifest_hash)
    : ZERO_HASH;
  if ((await deps.chain.latest(seriesId)).toLowerCase() !== previous) {
    return refuse(deps, publicationId, 'chain_previous_mismatch');
  }

  const receipt = await deps.chain.anchor(seriesId, hash, previous);
  await deps.store.markPublished(publicationId, receipt, deps.chain);
  return outcome(receipt, false);
}

/** Runs tasks one at a time: one wallet, one nonce sequence, no racing transactions. */
export class SingleFlight {
  #tail: Promise<unknown> = Promise.resolve();

  run<T>(task: () => Promise<T>): Promise<T> {
    const next = this.#tail.then(task, task);
    this.#tail = next.then(
      () => undefined,
      () => undefined,
    );
    return next;
  }
}

export interface ReconcileResult {
  events: number;
  orphans: AnchoredEvent[];
  unexpectedRetractions: RetractedEvent[];
  balanceWei: bigint;
  lowBalance: boolean;
}

/**
 * Every Anchored event must belong to a publication the database knows, and every Retracted event
 * to a publication it records as retracted. Anything else means the publisher key was used outside
 * the workflow (T16, T17): it is recorded as a security event so the admin can revoke the key.
 */
export async function reconcile(deps: AnchorDeps, minBalanceWei: bigint): Promise<ReconcileResult> {
  const events = await deps.chain.anchoredEvents(deps.deployBlock);
  const known = await deps.store.knownManifestHashes();
  const orphans = events.filter((event) => !known.has(fromBytes32(event.manifestHash)));
  for (const orphan of orphans) {
    await deps.store.recordSecurityEvent('chain.orphan_anchor', {
      manifest_hash: fromBytes32(orphan.manifestHash),
      tx_hash: orphan.txHash,
      block: orphan.blockNumber,
    });
  }
  const retracted = await deps.store.retractedManifestHashes();
  const unexpectedRetractions = (await deps.chain.retractedEvents(deps.deployBlock)).filter(
    (event) => !retracted.has(fromBytes32(event.manifestHash)),
  );
  for (const retraction of unexpectedRetractions) {
    await deps.store.recordSecurityEvent('chain.unexpected_retraction', {
      manifest_hash: fromBytes32(retraction.manifestHash),
      tx_hash: retraction.txHash,
      block: retraction.blockNumber,
    });
  }
  const balanceWei = await deps.chain.publisherBalance();
  const lowBalance = balanceWei < minBalanceWei;
  if (lowBalance) {
    await deps.store.recordSecurityEvent('anchor.low_balance', {
      address: await deps.chain.publisherAddress(),
      balance_wei: balanceWei.toString(),
    });
  }
  return { events: events.length, orphans, unexpectedRetractions, balanceWei, lowBalance };
}
