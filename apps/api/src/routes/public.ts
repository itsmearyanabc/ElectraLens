import QRCode from 'qrcode';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';

import type { Deps } from '../deps.ts';
import { HttpError, notFound } from '../errors.ts';

// B07.06: public reads as an anonymous visitor (RLS and column grants decide what is visible),
// cacheable for 60 seconds at the edge.

const uuid = z.uuid();
const areaCode = z
  .string()
  .regex(/^[A-Z0-9]+(-[A-Z0-9]+)*$/)
  .max(64);
const boothCode = z.string().regex(/^[0-9A-HJKMNP-TV-Z]{10}$/);

const ANCHOR_COLUMNS =
  'anchor_type, status, network, chain_id, contract_address, tx_hash, block_number, log_index, ots_path, confirmed_at';
const PUBLICATION_COLUMNS = `id, series_id, sequence, status, manifest_hash, published_at, retracted_at, retraction_reason, supersedes_id, previous_publication_id, is_synthetic, run_id, report_path, report_hash, aggregates_path, aggregates_hash, blockchain_anchors(${ANCHOR_COLUMNS})`;

type Data<R> = R extends { data: infer D } ? D : never;

function unwrap<R extends { data: unknown; error: unknown }>(result: R): Data<R> {
  if (result.error) throw new HttpError(502, 'database.unavailable');
  return result.data as Data<R>;
}

function found<T>(value: T | null | undefined): NonNullable<T> {
  if (value === null || value === undefined) throw notFound();
  return value as NonNullable<T>;
}

export const OFFICIAL_LINKS = [
  { id: 'voters_portal', url: 'https://voters.eci.gov.in/', official: true },
  { id: 'electoral_search', url: 'https://electoralsearch.eci.gov.in/', official: true },
  { id: 'eci', url: 'https://www.eci.gov.in/', official: true },
  { id: 'helpline', url: 'tel:1950', official: true },
] as const;

export const publicRoutes =
  (deps: Deps): FastifyPluginAsyncZod =>
  async (app) => {
    const db = deps.anon;
    app.addHook('onSend', async (request, reply) => {
      if (request.method === 'GET' && reply.statusCode === 200) {
        reply.header('cache-control', 'public, s-maxage=60, stale-while-revalidate=300');
      }
    });

    const artifact = (path: string | null) =>
      path ? `${deps.config.supabaseUrl}/storage/v1/object/public/public-artifacts/${path}` : null;

    app.get(
      '/jurisdictions',
      { schema: { querystring: z.object({ parent: areaCode.optional() }) } },
      async (request) => {
        let query = db
          .from('jurisdictions')
          .select('id, code, level, parent_id, name, is_synthetic')
          .order('code');
        if (request.query.parent) {
          const parent = found(
            unwrap(
              await db
                .from('jurisdictions')
                .select('id')
                .eq('code', request.query.parent)
                .maybeSingle(),
            ),
          );
          query = query.eq('parent_id', parent.id);
        } else {
          query = query.eq('level', 'state');
        }
        return unwrap(await query);
      },
    );

    app.get('/publications', async () =>
      unwrap(
        await db
          .from('publications')
          .select(PUBLICATION_COLUMNS)
          .order('series_id')
          .order('sequence', { ascending: false }),
      ),
    );

    app.get('/publications/:id', { schema: { params: z.object({ id: uuid }) } }, async (request) =>
      found(
        unwrap(
          await db
            .from('publications')
            .select(
              `${PUBLICATION_COLUMNS}, manifest, publication_approvals(step, decision, created_at)`,
            )
            .eq('id', request.params.id)
            .maybeSingle(),
        ),
      ),
    );

    /** Everything an independent verifier needs, with the files' public URLs (B10). */
    app.get('/verify/:id', { schema: { params: z.object({ id: uuid }) } }, async (request) => {
      const p = found(
        unwrap(
          await db
            .from('publications')
            .select(PUBLICATION_COLUMNS)
            .eq('id', request.params.id)
            .maybeSingle(),
        ),
      );
      const folder = `${p.series_id}/${p.sequence}`;
      return {
        id: p.id,
        series_id: p.series_id,
        sequence: p.sequence,
        status: p.status,
        manifest_hash: p.manifest_hash,
        files: {
          manifest: artifact(`${folder}/manifest.json`),
          report: artifact(p.report_path),
          aggregates: artifact(p.aggregates_path),
        },
        anchors: p.blockchain_anchors,
        procedure:
          'SHA-256 of the RFC 8785 canonical manifest equals manifest_hash; registry.entry(keccak256(series_id), sequence).manifestHash equals it on-chain.',
      };
    });

    app.get(
      '/findings',
      {
        schema: {
          querystring: z.object({
            rule: z
              .string()
              .regex(/^R[0-9]{2}$/)
              .optional(),
            strength: z.enum(['strong', 'moderate', 'data_quality']).optional(),
            run: uuid.optional(),
            area: areaCode.optional(),
            limit: z.coerce.number().int().min(1).max(100).default(50),
            offset: z.coerce.number().int().min(0).max(100_000).default(0),
          }),
        },
      },
      async (request) => {
        const q = request.query;
        let query = db
          .from('anomaly_findings')
          .select(
            'id, run_id, finding_code, rule_id, signal_strength, review_status, label, finding',
            { count: 'exact' },
          )
          .order('finding_code');
        if (q.rule) query = query.eq('rule_id', q.rule);
        if (q.strength) query = query.eq('signal_strength', q.strength);
        if (q.run) query = query.eq('run_id', q.run);
        if (q.area)
          query = query.or(
            `finding->area->>code.eq.${q.area},finding->area->>code.like.${q.area}-*`,
          );
        const result = await query.range(q.offset, q.offset + q.limit - 1);
        return { total: result.count ?? 0, items: unwrap(result) };
      },
    );

    app.get('/findings/:id', { schema: { params: z.object({ id: uuid }) } }, async (request) =>
      found(
        unwrap(
          await db.from('anomaly_findings').select('*').eq('id', request.params.id).maybeSingle(),
        ),
      ),
    );

    const DATASET_COLUMNS =
      'id, kind, label, qualifying_date, roll_stage, schema_version, status, canonical_root, row_count, is_synthetic, jurisdiction_id, data_sources(name, publisher, url, permission_basis, licence_note)';
    app.get('/datasets', async () =>
      unwrap(await db.from('dataset_versions').select(DATASET_COLUMNS).order('qualifying_date')),
    );
    app.get('/datasets/:id', { schema: { params: z.object({ id: uuid }) } }, async (request) =>
      found(
        unwrap(
          await db
            .from('dataset_versions')
            .select(DATASET_COLUMNS)
            .eq('id', request.params.id)
            .maybeSingle(),
        ),
      ),
    );

    app.get(
      '/methodology/:version',
      { schema: { params: z.object({ version: z.string().regex(/^[0-9]{4}\.[0-9]+$/) }) } },
      async (request) =>
        found(
          unwrap(
            await db
              .from('methodology_versions')
              .select('version, params, params_hash, status, notes, published_at')
              .eq('version', request.params.version)
              .maybeSingle(),
          ),
        ),
    );

    /** Aggregates for an area and the areas directly inside it, from one publication. */
    app.get(
      '/comparisons',
      { schema: { querystring: z.object({ publication: uuid, area: areaCode }) } },
      async (request) => {
        const area = found(
          unwrap(
            await db
              .from('jurisdictions')
              .select('id, code')
              .eq('code', request.query.area)
              .maybeSingle(),
          ),
        );
        const children = unwrap(
          await db.from('jurisdictions').select('id').eq('parent_id', area.id),
        );
        const ids = [area.id, ...found(children).map((c) => c.id)];
        return unwrap(
          await db
            .from('aggregate_metrics')
            .select('jurisdiction_id, metric, dims, value, suppressed')
            .eq('publication_id', request.query.publication)
            .in('jurisdiction_id', ids)
            .limit(5000),
        );
      },
    );

    // B13.04: booths by area only. There is no search by person.
    app.get(
      '/booths',
      { schema: { querystring: z.object({ area: areaCode }) } },
      async (request) => {
        const area = found(
          unwrap(
            await db
              .from('jurisdictions')
              .select('id, level')
              .eq('code', request.query.area)
              .maybeSingle(),
          ),
        );
        const acIds =
          area.level === 'ac'
            ? [area.id]
            : found(
                unwrap(await db.from('jurisdictions').select('id').eq('parent_id', area.id)),
              ).map((r) => r.id);
        return unwrap(
          await db
            .from('polling_stations')
            .select(
              'public_code, station_code, parts_served, name, address, accessibility, verified_at, is_synthetic',
            )
            .in('ac_id', acIds)
            .order('station_code')
            .limit(500),
        );
      },
    );

    app.get(
      '/booths/:code',
      { schema: { params: z.object({ code: boothCode }) } },
      async (request) =>
        found(
          unwrap(
            await db
              .from('polling_stations')
              .select(
                'public_code, station_code, parts_served, name, address, accessibility, source_url, verified_at, is_synthetic',
              )
              .eq('public_code', request.params.code)
              .maybeSingle(),
          ),
        ),
    );

    /** B13.05: the QR encodes only https://<host>/b/<code>. */
    app.get(
      '/booths/:code/qr.svg',
      { schema: { params: z.object({ code: boothCode }) } },
      async (request, reply) => {
        found(
          unwrap(
            await db
              .from('polling_stations')
              .select('public_code')
              .eq('public_code', request.params.code)
              .maybeSingle(),
          ),
        );
        const svg = await QRCode.toString(`${deps.config.appOrigin}/b/${request.params.code}`, {
          type: 'svg',
          errorCorrectionLevel: 'M',
          margin: 1,
        });
        return reply.type('image/svg+xml').send(svg);
      },
    );

    app.get('/official-links', () => OFFICIAL_LINKS);
  };
