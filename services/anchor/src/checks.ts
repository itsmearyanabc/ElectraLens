// What must be true before anything is written on-chain (B08.06, threat T16). The anchor service
// trusts no caller, including our own API: it reloads the publication, recomputes the manifest
// hash itself and re-checks the two-person approval.
import { manifestHash } from '@electralens/canon';
import { manifestV1, type ManifestV1 } from '@electralens/schemas';

export interface Approval {
  approver_id: string;
  step: 'review' | 'publish';
  decision: 'approve' | 'reject';
  manifest_hash: string;
}

export interface PublicationRecord {
  id: string;
  status: string;
  series_id: string;
  sequence: number;
  manifest: unknown;
  manifest_hash: string | null;
  run_created_by: string | null;
  approvals: Approval[];
}

export type RefusalReason =
  | 'not_found'
  | 'not_approved'
  | 'no_manifest'
  | 'invalid_manifest'
  | 'hash_mismatch'
  | 'manifest_mismatch'
  | 'missing_approvals'
  | 'same_approver'
  | 'run_creator_approved'
  | 'sequence_mismatch'
  | 'chain_previous_mismatch'
  | 'anchored_in_other_series';

export type CheckResult =
  { ok: true; manifest: ManifestV1; hash: string } | { ok: false; reason: RefusalReason };

export function checkPublication(record: PublicationRecord): CheckResult {
  const refuse = (reason: RefusalReason): CheckResult => ({ ok: false, reason });
  if (record.status !== 'approved') return refuse('not_approved');
  if (record.manifest === null || record.manifest_hash === null) return refuse('no_manifest');

  const parsed = manifestV1.safeParse(record.manifest);
  if (!parsed.success) return refuse('invalid_manifest');
  const hash = manifestHash(parsed.data);
  if (hash !== record.manifest_hash) return refuse('hash_mismatch');
  if (parsed.data.series_id !== record.series_id || parsed.data.sequence !== record.sequence) {
    return refuse('manifest_mismatch');
  }

  const valid = record.approvals.filter(
    (a) => a.decision === 'approve' && a.manifest_hash === hash,
  );
  const review = valid.find((a) => a.step === 'review');
  const publish = valid.find((a) => a.step === 'publish');
  if (!review || !publish) return refuse('missing_approvals');
  if (review.approver_id === publish.approver_id) return refuse('same_approver');
  if (
    record.run_created_by !== null &&
    (review.approver_id === record.run_created_by || publish.approver_id === record.run_created_by)
  ) {
    return refuse('run_creator_approved');
  }
  return { ok: true, manifest: parsed.data, hash };
}
