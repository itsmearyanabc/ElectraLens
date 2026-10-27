import 'server-only';

import { env } from '../env';
import { PUBLIC_REVALIDATE_SECONDS } from '../supabase/public';
import { artifactUrl } from './public';

/** Public artifacts are immutable once published, so they're cached like other public data. */
export async function fetchArtifactJson<T>(objectPath: string | null | undefined): Promise<T | null> {
  if (!objectPath) return null;
  try {
    const response = await fetch(artifactUrl(env.supabaseUrl(), objectPath), {
      next: { revalidate: PUBLIC_REVALIDATE_SECONDS },
    });
    if (!response.ok) return null;
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

export interface ReportDocument {
  findings_total: number;
  review_counts: { accepted: number; downgraded: number; rejected: number };
  weak_findings_not_published: number;
  benchmark?: {
    overall: BenchmarkScore;
    per_rule: Record<string, BenchmarkScore>;
  };
}

export interface BenchmarkScore {
  precision: string;
  recall: string;
  true_positives: number;
  false_positives: number;
  false_negatives: number;
}
