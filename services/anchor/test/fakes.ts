// In-memory stand-ins that follow the registry contract's rules exactly (the contract suite tests
// the real thing), plus a publication factory.
import { randomBytes } from 'node:crypto';

import { manifestHash } from '@electralens/canon';
import type { ManifestV1 } from '@electralens/schemas';

import type { AnchoredEvent, AnchorReceipt, Chain, RetractedEvent } from '../src/chain.ts';
import { ZERO_HASH } from '../src/chain.ts';
import type { PublicationRecord } from '../src/checks.ts';
import type { PublicationStore } from '../src/store.ts';

export class FakeChain implements Chain {
  readonly network = 'test';
  readonly chainId = 31337n;
  readonly address = '0x' + '5'.repeat(40);
  readonly series = new Map<string, string[]>();
  readonly events: AnchoredEvent[] = [];
  readonly retractions: RetractedEvent[] = [];
  balance = 10n ** 18n;
  failNextAnchor = false;
  block = 100;

  async latest(seriesId: string) {
    return this.series.get(seriesId)?.at(-1) ?? ZERO_HASH;
  }
  async count(seriesId: string) {
    return BigInt(this.series.get(seriesId)?.length ?? 0);
  }
  async isAnchored(manifestHash: string) {
    return this.events.some((e) => e.manifestHash === manifestHash);
  }
  async anchor(seriesId: string, manifestHash: string, previous: string): Promise<AnchorReceipt> {
    if (this.failNextAnchor) {
      this.failNextAnchor = false;
      throw new Error('rpc unavailable');
    }
    if (await this.isAnchored(manifestHash)) throw new Error('AlreadyAnchored');
    if ((await this.latest(seriesId)) !== previous) throw new Error('UnexpectedPrevious');
    const list = this.series.get(seriesId) ?? [];
    list.push(manifestHash);
    this.series.set(seriesId, list);
    this.block += 1;
    const event: AnchoredEvent = {
      seriesId,
      manifestHash,
      sequence: BigInt(list.length),
      txHash: '0x' + randomBytes(32).toString('hex'),
      blockNumber: this.block,
      logIndex: 0,
    };
    this.events.push(event);
    return event;
  }
  async findAnchor(manifestHash: string) {
    return this.events.find((e) => e.manifestHash === manifestHash) ?? null;
  }
  async anchoredEvents() {
    return [...this.events];
  }
  async retractedEvents() {
    return [...this.retractions];
  }
  /** What the publisher key does when someone calls retract() on the contract. */
  retract(seriesId: string, manifestHash: string) {
    this.block += 1;
    this.retractions.push({
      seriesId,
      manifestHash,
      txHash: '0x' + randomBytes(32).toString('hex'),
      blockNumber: this.block,
      logIndex: 0,
    });
  }
  async publisherAddress() {
    return '0x' + '7'.repeat(40);
  }
  async publisherBalance() {
    return this.balance;
  }
}

export class FakeStore implements PublicationStore {
  readonly publications = new Map<string, PublicationRecord>();
  readonly published = new Map<string, AnchorReceipt>();
  readonly securityEvents: { type: string; details: Record<string, unknown> }[] = [];
  failNextMark = false;

  async getPublication(id: string) {
    return this.publications.get(id) ?? null;
  }
  async markPublished(id: string, receipt: AnchorReceipt) {
    if (this.failNextMark) {
      this.failNextMark = false;
      throw new Error('database unavailable');
    }
    const record = this.publications.get(id);
    if (!record || record.status !== 'approved') throw new Error('workflow.illegal_transition');
    record.status = 'published';
    this.published.set(id, receipt);
  }
  async recordSecurityEvent(type: string, details: Record<string, unknown>) {
    this.securityEvents.push({ type, details });
  }
  async knownManifestHashes() {
    return this.#hashes(['approved', 'published', 'retracted']);
  }
  async retractedManifestHashes() {
    return this.#hashes(['retracted']);
  }
  #hashes(statuses: string[]) {
    return new Set(
      [...this.publications.values()]
        .filter((p) => statuses.includes(p.status) && p.manifest_hash)
        .map((p) => p.manifest_hash as string),
    );
  }
}

let counter = 0;

/** An approved publication with a valid manifest and two different approvers. */
export function approvedPublication(
  sequence = 1,
  previousManifestHash: string | null = null,
  seriesId = 'DEMO-HR',
): PublicationRecord {
  counter += 1;
  const id = `00000000-0000-4000-8000-${String(counter).padStart(12, '0')}`;
  const manifest: ManifestV1 = {
    schema: 'electralens.manifest.v1',
    series_id: seriesId,
    sequence,
    previous_manifest_hash: previousManifestHash,
    is_synthetic: true,
    datasets: [
      {
        role: 'target',
        version_id: '6f1c9a52-6b1e-4c3e-9a51-0e6b2f4d7a10',
        root: (counter % 10).toString().repeat(64),
        row_count: 3,
        schema: 'electoral_roll_v1',
        canon: 'elcanon-1',
      },
    ],
    audit_run: null,
    report_hash: null,
    aggregates_hash: null,
    published_at: '2027-01-15T10:00:00Z',
    publisher: 'ElectraLens (independent, not affiliated with ECI)',
  };
  const hash = manifestHash(manifest);
  return {
    id,
    status: 'approved',
    series_id: seriesId,
    sequence,
    manifest,
    manifest_hash: hash,
    run_created_by: 'analyst',
    approvals: [
      { approver_id: 'reviewer', step: 'review', decision: 'approve', manifest_hash: hash },
      { approver_id: 'publisher', step: 'publish', decision: 'approve', manifest_hash: hash },
    ],
  };
}
