// Database access for the anchor service. It reads publications and calls mark_published with the
// Supabase secret key (service role); every state change still goes through the workflow function.
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import type { AnchorReceipt, Chain } from './chain.ts';
import type { Approval, PublicationRecord } from './checks.ts';

export interface PublicationStore {
  getPublication(id: string): Promise<PublicationRecord | null>;
  markPublished(id: string, receipt: AnchorReceipt, chain: Chain): Promise<void>;
  recordSecurityEvent(eventType: string, details: Record<string, unknown>): Promise<void>;
  /** Manifest hashes the database knows about (approved, published or retracted). */
  knownManifestHashes(): Promise<Set<string>>;
  /** Manifest hashes of publications the database records as retracted. */
  retractedManifestHashes(): Promise<Set<string>>;
}

interface PublicationRow {
  id: string;
  status: string;
  series_id: string;
  sequence: number;
  manifest: unknown;
  manifest_hash: string | null;
  audit_runs: { created_by: string | null } | null;
  publication_approvals: Approval[];
}

export class SupabaseStore implements PublicationStore {
  readonly #db: SupabaseClient;

  constructor(url: string, secretKey: string) {
    this.#db = createClient(url, secretKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }

  async getPublication(id: string): Promise<PublicationRecord | null> {
    const { data, error } = await this.#db
      .from('publications')
      .select(
        'id, status, series_id, sequence, manifest, manifest_hash, audit_runs(created_by), ' +
          'publication_approvals(approver_id, step, decision, manifest_hash)',
      )
      .eq('id', id)
      .maybeSingle<PublicationRow>();
    if (error) throw new Error(`could not load publication: ${error.message}`);
    if (!data) return null;
    return {
      id: data.id,
      status: data.status,
      series_id: data.series_id,
      sequence: data.sequence,
      manifest: data.manifest,
      manifest_hash: data.manifest_hash,
      run_created_by: data.audit_runs?.created_by ?? null,
      approvals: data.publication_approvals,
    };
  }

  async markPublished(id: string, receipt: AnchorReceipt, chain: Chain): Promise<void> {
    const { error } = await this.#db.rpc('mark_published', {
      p_id: id,
      p_network: chain.network,
      p_chain_id: Number(chain.chainId),
      p_contract: chain.address,
      p_tx_hash: receipt.txHash,
      p_block: receipt.blockNumber,
      p_log_index: receipt.logIndex,
    });
    if (error) throw new Error(`mark_published failed: ${error.message}`);
  }

  async recordSecurityEvent(eventType: string, details: Record<string, unknown>): Promise<void> {
    const { error } = await this.#db
      .from('security_events')
      .insert({ event_type: eventType, details });
    if (error) console.error(`could not record security event ${eventType}: ${error.message}`);
  }

  knownManifestHashes(): Promise<Set<string>> {
    return this.#manifestHashes(['approved', 'published', 'retracted']);
  }

  retractedManifestHashes(): Promise<Set<string>> {
    return this.#manifestHashes(['retracted']);
  }

  async #manifestHashes(statuses: string[]): Promise<Set<string>> {
    const { data, error } = await this.#db
      .from('publications')
      .select('manifest_hash')
      .in('status', statuses)
      .not('manifest_hash', 'is', null);
    if (error) throw new Error(`could not list publications: ${error.message}`);
    return new Set((data as { manifest_hash: string }[]).map((row) => row.manifest_hash));
  }
}
