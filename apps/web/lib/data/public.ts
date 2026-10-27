import 'server-only';

import { cache } from 'react';

import { publicDb } from '../supabase/public';
import { DataUnavailable, type Enums, type Json } from './types';

// Public reads. Every query runs as an anonymous visitor, so RLS and column grants decide what
// comes back; nothing here can see unpublished rows or restricted columns.

const AREA_CODE = /^[A-Z0-9]+(-[A-Z0-9]+)*$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export const isAreaCode = (value: unknown): value is string =>
  typeof value === 'string' && value.length <= 64 && AREA_CODE.test(value);
export const isUuid = (value: unknown): value is string =>
  typeof value === 'string' && UUID.test(value);

function check<T>(what: string, result: { data: T | null; error: unknown }): T {
  if (result.error) throw new DataUnavailable(what, result.error);
  return result.data as T;
}

// ---- areas --------------------------------------------------------------------------------

export interface Area {
  id: string;
  code: string;
  level: Enums['jurisdiction_level'];
  parent_id: string | null;
  name: Json;
  is_synthetic: boolean;
}

const AREA_COLUMNS = 'id, code, level, parent_id, name, is_synthetic';

export const getArea = cache(async (code: string): Promise<Area | null> => {
  if (!isAreaCode(code)) return null;
  return check(
    'area',
    await publicDb().from('jurisdictions').select(AREA_COLUMNS).eq('code', code).maybeSingle(),
  );
});

export const getAreaById = cache(async (id: string): Promise<Area | null> =>
  check(
    'area',
    await publicDb().from('jurisdictions').select(AREA_COLUMNS).eq('id', id).maybeSingle(),
  ),
);

export const getChildAreas = cache(async (parentId: string): Promise<Area[]> =>
  check(
    'areas',
    await publicDb()
      .from('jurisdictions')
      .select(AREA_COLUMNS)
      .eq('parent_id', parentId)
      .order('code'),
  ),
);

export const getTopAreas = cache(async (): Promise<Area[]> =>
  check(
    'areas',
    await publicDb().from('jurisdictions').select(AREA_COLUMNS).eq('level', 'state').order('code'),
  ),
);

export const getAreasByIds = cache(async (ids: readonly string[]): Promise<Map<string, Area>> => {
  if (ids.length === 0) return new Map();
  const rows = check(
    'areas',
    await publicDb()
      .from('jurisdictions')
      .select(AREA_COLUMNS)
      .in('id', [...new Set(ids)]),
  );
  return new Map(rows.map((row) => [row.id, row]));
});

/** The chain from the state down to this area, for breadcrumbs. */
export async function areaPath(area: Area): Promise<Area[]> {
  const path = [area];
  let current = area;
  while (current.parent_id) {
    const parent = await getAreaById(current.parent_id);
    if (!parent) break;
    path.unshift(parent);
    current = parent;
  }
  return path;
}

// ---- publications -------------------------------------------------------------------------

export interface AnchorSummary {
  anchor_type: Enums['anchor_type'];
  status: Enums['anchor_status'];
  network: string;
  chain_id: number | null;
  contract_address: string | null;
  tx_hash: string | null;
  block_number: number | null;
  log_index: number | null;
  ots_path: string | null;
  confirmed_at: string | null;
}

export interface PublicationSummary {
  id: string;
  series_id: string;
  sequence: number;
  status: Enums['publication_status'];
  manifest_hash: string | null;
  published_at: string | null;
  retracted_at: string | null;
  supersedes_id: string | null;
  previous_publication_id: string | null;
  is_synthetic: boolean;
  run_id: string | null;
  blockchain_anchors: AnchorSummary[];
}

const ANCHOR_COLUMNS =
  'anchor_type, status, network, chain_id, contract_address, tx_hash, block_number, log_index, ots_path, confirmed_at';
const PUBLICATION_COLUMNS = `id, series_id, sequence, status, manifest_hash, published_at, retracted_at, supersedes_id, previous_publication_id, is_synthetic, run_id, blockchain_anchors(${ANCHOR_COLUMNS})`;

export const listPublications = cache(async (): Promise<PublicationSummary[]> =>
  check(
    'publications',
    await publicDb()
      .from('publications')
      .select(PUBLICATION_COLUMNS)
      .order('series_id')
      .order('sequence', { ascending: false }),
  ),
);

export const latestPublication = cache(async (): Promise<PublicationSummary | null> =>
  check(
    'publication',
    await publicDb()
      .from('publications')
      .select(PUBLICATION_COLUMNS)
      .eq('status', 'published')
      .order('published_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ),
);

export interface PublicationDetail extends PublicationSummary {
  manifest: Json;
  report_path: string | null;
  report_hash: string | null;
  aggregates_path: string | null;
  aggregates_hash: string | null;
  retraction_reason: string | null;
  publication_approvals: { step: Enums['approval_step']; decision: string; created_at: string }[];
}

export const getPublication = cache(async (id: string): Promise<PublicationDetail | null> => {
  if (!isUuid(id)) return null;
  return check(
    'publication',
    await publicDb()
      .from('publications')
      .select(
        `${PUBLICATION_COLUMNS}, manifest, report_path, report_hash, aggregates_path, aggregates_hash, retraction_reason, publication_approvals(step, decision, created_at)`,
      )
      .eq('id', id)
      .maybeSingle(),
  );
});

/** Publications that replace this one (corrections). */
export const getSupersedingPublications = cache(async (id: string) =>
  check(
    'publications',
    await publicDb()
      .from('publications')
      .select('id, series_id, sequence, status, published_at')
      .eq('supersedes_id', id),
  ),
);

// ---- runs and datasets --------------------------------------------------------------------

export interface RunSummary {
  id: string;
  baseline_version_id: string;
  target_version_id: string;
  methodology_version: string;
  status: Enums['run_status'];
  engine_version: string | null;
  params_hash: string | null;
  output_hash: string | null;
  tests_in_run: Json;
  finished_at: string | null;
}

const RUN_COLUMNS =
  'id, baseline_version_id, target_version_id, methodology_version, status, engine_version, params_hash, output_hash, tests_in_run, finished_at';

export const getRun = cache(async (id: string): Promise<RunSummary | null> => {
  if (!isUuid(id)) return null;
  return check(
    'run',
    await publicDb().from('audit_runs').select(RUN_COLUMNS).eq('id', id).maybeSingle(),
  );
});

export const runsUsingDataset = cache(async (versionId: string): Promise<RunSummary[]> =>
  check(
    'runs',
    await publicDb()
      .from('audit_runs')
      .select(RUN_COLUMNS)
      .or(`baseline_version_id.eq.${versionId},target_version_id.eq.${versionId}`),
  ),
);

export interface DatasetSummary {
  id: string;
  kind: Enums['dataset_kind'];
  label: string;
  qualifying_date: string | null;
  roll_stage: string | null;
  schema_version: string;
  status: Enums['dataset_status'];
  canonical_root: string | null;
  row_count: number | null;
  is_synthetic: boolean;
  created_at: string;
  jurisdiction_id: string;
  data_sources: {
    name: string;
    publisher: string;
    url: string | null;
    permission_basis: Enums['permission_basis'];
    licence_note: string | null;
  } | null;
}

const DATASET_COLUMNS =
  'id, kind, label, qualifying_date, roll_stage, schema_version, status, canonical_root, row_count, is_synthetic, created_at, jurisdiction_id, data_sources(name, publisher, url, permission_basis, licence_note)';

export const listDatasets = cache(async (): Promise<DatasetSummary[]> =>
  check(
    'datasets',
    await publicDb()
      .from('dataset_versions')
      .select(DATASET_COLUMNS)
      .order('qualifying_date', { ascending: false }),
  ),
);

export const getDataset = cache(async (id: string): Promise<DatasetSummary | null> => {
  if (!isUuid(id)) return null;
  return check(
    'dataset',
    await publicDb().from('dataset_versions').select(DATASET_COLUMNS).eq('id', id).maybeSingle(),
  );
});

// ---- findings -----------------------------------------------------------------------------

export interface FindingRow {
  id: string;
  run_id: string;
  finding_code: string;
  rule_id: string;
  rule_version: string;
  jurisdiction_id: string;
  signal_strength: Enums['signal_strength'];
  review_status: Enums['review_decision'];
  label: Enums['content_label'];
  finding: Json;
  created_at: string;
}

const FINDING_COLUMNS =
  'id, run_id, finding_code, rule_id, rule_version, jurisdiction_id, signal_strength, review_status, label, finding, created_at';

export interface FindingFilters {
  rule?: string;
  area?: string;
  strength?: Enums['signal_strength'];
  review?: Enums['review_decision'];
  run?: string;
  page: number;
}

export const FINDINGS_PAGE_SIZE = 20;
const RULE = /^R[0-9]{2}$/;

export async function listFindings(filters: FindingFilters) {
  let query = publicDb()
    .from('anomaly_findings')
    .select(FINDING_COLUMNS, { count: 'exact' })
    .order('signal_strength')
    .order('finding_code');
  if (filters.rule && RULE.test(filters.rule)) query = query.eq('rule_id', filters.rule);
  if (filters.strength) query = query.eq('signal_strength', filters.strength);
  if (filters.review) query = query.eq('review_status', filters.review);
  if (filters.run && isUuid(filters.run)) query = query.eq('run_id', filters.run);
  if (filters.area && isAreaCode(filters.area)) {
    // Codes are hierarchical (DEMO-HR-AC901-P001), so an area includes every code below it.
    query = query.or(
      `finding->area->>code.eq.${filters.area},finding->area->>code.like.${filters.area}-*`,
    );
  }
  const from = (filters.page - 1) * FINDINGS_PAGE_SIZE;
  const result = await query.range(from, from + FINDINGS_PAGE_SIZE - 1);
  if (result.error) throw new DataUnavailable('findings', result.error);
  return { rows: result.data as FindingRow[], total: result.count ?? 0 };
}

export const getFinding = cache(async (id: string): Promise<FindingRow | null> => {
  if (!isUuid(id)) return null;
  return check(
    'finding',
    await publicDb().from('anomaly_findings').select(FINDING_COLUMNS).eq('id', id).maybeSingle(),
  );
});

/** Counts of public findings by rule and strength, for one run. */
export const findingCounts = cache(async (runId: string) => {
  const rows = check(
    'findings',
    await publicDb()
      .from('anomaly_findings')
      .select('rule_id, signal_strength, review_status')
      .eq('run_id', runId),
  );
  return rows;
});

// ---- aggregates ---------------------------------------------------------------------------

export interface AggregateRow {
  jurisdiction_id: string;
  metric: string;
  dims: Json;
  value: number | null;
  suppressed: boolean;
}

export const getAggregates = cache(
  async (publicationId: string, areaIds: readonly string[]): Promise<AggregateRow[]> => {
    if (areaIds.length === 0) return [];
    return check(
      'aggregates',
      await publicDb()
        .from('aggregate_metrics')
        .select('jurisdiction_id, metric, dims, value, suppressed')
        .eq('publication_id', publicationId)
        .in('jurisdiction_id', [...areaIds])
        .limit(5000),
    );
  },
);

// ---- methodology --------------------------------------------------------------------------

export interface MethodologyVersion {
  version: string;
  params: Json;
  params_hash: string;
  status: string;
  notes: string | null;
  published_at: string | null;
}

export const listMethodologyVersions = cache(async (): Promise<MethodologyVersion[]> =>
  check(
    'methodology',
    await publicDb()
      .from('methodology_versions')
      .select('version, params, params_hash, status, notes, published_at')
      .order('version', { ascending: false }),
  ),
);

export const getMethodologyVersion = cache(
  async (version: string): Promise<MethodologyVersion | null> => {
    if (!/^[0-9]{4}\.[0-9]+$/.test(version)) return null;
    return check(
      'methodology',
      await publicDb()
        .from('methodology_versions')
        .select('version, params, params_hash, status, notes, published_at')
        .eq('version', version)
        .maybeSingle(),
    );
  },
);

// ---- booths -------------------------------------------------------------------------------

export interface Booth {
  id: string;
  public_code: string;
  station_code: string;
  ac_id: string;
  parts_served: number[];
  name: Json;
  address: Json;
  accessibility: Json;
  source_url: string | null;
  verified_at: string | null;
  is_synthetic: boolean;
}

const BOOTH_COLUMNS =
  'id, public_code, station_code, ac_id, parts_served, name, address, accessibility, source_url, verified_at, is_synthetic';
const BOOTH_CODE = /^[0-9A-HJKMNP-TV-Z]{10}$/;

export const getBooth = cache(async (code: string): Promise<Booth | null> => {
  if (!BOOTH_CODE.test(code)) return null;
  return check(
    'booth',
    await publicDb()
      .from('polling_stations')
      .select(BOOTH_COLUMNS)
      .eq('public_code', code)
      .maybeSingle(),
  );
});

/** Booths in one constituency, or in every constituency of a district. Never by person. */
export const boothsInArea = cache(async (acIds: readonly string[]): Promise<Booth[]> => {
  if (acIds.length === 0) return [];
  return check(
    'booths',
    await publicDb()
      .from('polling_stations')
      .select(BOOTH_COLUMNS)
      .in('ac_id', [...acIds])
      .order('station_code')
      .limit(500),
  );
});

// ---- claims -------------------------------------------------------------------------------

export interface PublishedClaim {
  id: string;
  text: string | null;
  structured: Json;
  language: string;
  created_at: string;
  claim_assessments: {
    verdict: Enums['claim_verdict'];
    evidence: Json;
    publication_id: string | null;
    method_version: string;
    explanation: Json;
    created_at: string;
  }[];
}

const CLAIM_COLUMNS =
  'id, text, structured, language, created_at, claim_assessments(verdict, evidence, publication_id, method_version, explanation, created_at)';

export const getPublishedClaim = cache(async (id: string): Promise<PublishedClaim | null> => {
  if (!isUuid(id)) return null;
  return check(
    'claim',
    await publicDb().from('claim_submissions').select(CLAIM_COLUMNS).eq('id', id).maybeSingle(),
  );
});

export const listPublishedClaims = cache(async (): Promise<PublishedClaim[]> =>
  check(
    'claims',
    await publicDb()
      .from('claim_submissions')
      .select(CLAIM_COLUMNS)
      .order('created_at', { ascending: false })
      .limit(20),
  ),
);

/** Public artifact URL in the `public-artifacts` bucket. */
export function artifactUrl(supabaseUrl: string, objectPath: string): string {
  return `${supabaseUrl}/storage/v1/object/public/public-artifacts/${objectPath
    .split('/')
    .map(encodeURIComponent)
    .join('/')}`;
}
