import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';

import { requireStaff, STAFF_ROLES } from '../auth.ts';
import type { Deps } from '../deps.ts';
import { forbidden, fromDatabase, HttpError, notFound, sqlNull } from '../errors.ts';
import { recordSecurityEvent } from '../security.ts';

// B07.08–B07.09: the staff steps that need a secret the web server must not hold. Every
// state change still goes through a workflow function called with the staff member's own
// token, so the database checks role, scope, aal2 and the two-person rule.

type Data<R> = R extends { data: infer D } ? D : never;

/** The rows of a Supabase response, or an HTTP error carrying the database's code. */
function unwrap<R extends { data: unknown; error: { message: string } | null }>(
  result: R,
): Data<R> {
  if (result.error) throw fromDatabase(result.error.message);
  return result.data as Data<R>;
}

const id = z.object({ id: z.uuid() });

export const staffRoutes =
  (deps: Deps): FastifyPluginAsyncZod =>
  async (app) => {
    app.addHook('onSend', async (_request, reply) => {
      reply.header('cache-control', 'private, no-store');
    });
    app.addHook('onError', async (request, _reply, error) => {
      if (error instanceof HttpError && error.status === 403) {
        await recordSecurityEvent(deps, request, 'staff.forbidden', { code: error.code });
      }
    });

    /** B03.02: a signed upload URL into the version's own quarantine folder. */
    app.post(
      '/datasets/:id/upload-url',
      { schema: { params: id, body: z.strictObject({ format: z.enum(['csv', 'parquet']) }) } },
      async (request) => {
        const caller = await requireStaff(deps, request, ['data_steward']);
        const version = unwrap(
          await deps
            .forUser(caller.token)
            .from('dataset_versions')
            .select('id, status')
            .eq('id', request.params.id)
            .maybeSingle(),
        );
        if (!version) throw notFound();
        if (version.status !== 'uploading') throw new HttpError(409, 'workflow.illegal_transition');
        const path = `${version.id}/original.${request.body.format}`;
        const { data, error } = await deps.service.storage
          .from('quarantine')
          .createSignedUploadUrl(path, { upsert: true });
        if (error || !data) throw new HttpError(502, 'storage.unavailable');
        // The database records paths with their bucket: quarantine/<version>/original.<ext>.
        return {
          path: `quarantine/${path}`,
          signed_url: data.signedUrl,
          token: data.token,
          max_bytes: 50 * 1024 * 1024,
        };
      },
    );

    /** Upload finished: the database checks the path and queues ingestion. */
    app.post(
      '/datasets/:id/uploaded',
      { schema: { params: id, body: z.strictObject({ path: z.string().max(200) }) } },
      async (request) => {
        const caller = await requireStaff(deps, request, ['data_steward']);
        const job = unwrap(
          await deps.forUser(caller.token).rpc('mark_dataset_uploaded', {
            p_id: request.params.id,
            p_original_path: request.body.path,
          }),
        );
        return { job };
      },
    );

    /** B07.09: restricted evidence through a 5-minute signed URL; every view is logged. */
    app.get('/findings/:id/evidence', { schema: { params: id } }, async (request) => {
      const caller = await requireStaff(deps, request, ['reviewer', 'analyst']);
      const finding = unwrap(
        await deps
          .forUser(caller.token)
          .from('anomaly_findings')
          .select('id, finding_code, restricted_evidence_path')
          .eq('id', request.params.id)
          .maybeSingle(),
      );
      if (!finding?.restricted_evidence_path) throw notFound();
      const { data, error } = await deps.service.storage
        .from('datasets-restricted')
        .createSignedUrl(finding.restricted_evidence_path, 300);
      if (error || !data) throw new HttpError(502, 'storage.unavailable');
      await deps.service.from('audit_log').insert({
        actor_id: caller.userId,
        actor_roles: caller.roles.map((r) => r.role),
        action: 'finding.evidence_view',
        target_type: 'finding',
        target_id: finding.id,
      });
      return { url: data.signedUrl, expires_in: 300 };
    });

    /**
     * Approve a review or publish step. When the second approval makes the publication
     * `approved`, the anchor service is asked to anchor it (HMAC-signed, B07.10).
     */
    app.post(
      '/publications/:id/approve',
      {
        schema: {
          params: id,
          body: z.strictObject({
            step: z.enum(['review', 'publish']),
            manifest_hash: z.string().regex(/^[0-9a-f]{64}$/),
            decision: z.enum(['approve', 'reject']).default('approve'),
            reason: z.string().max(2000).optional(),
          }),
        },
      },
      async (request) => {
        const caller = await requireStaff(
          deps,
          request,
          request.body.step === 'review' ? ['reviewer'] : ['publisher'],
        );
        const status = unwrap(
          await deps.forUser(caller.token).rpc('approve_publication', {
            p_id: request.params.id,
            p_step: request.body.step,
            p_manifest_hash: request.body.manifest_hash,
            p_decision: request.body.decision,
            p_reason: request.body.reason ?? sqlNull,
          }),
        );
        const anchor = status === 'approved' ? await deps.anchor(request.params.id) : null;
        return { status, anchor };
      },
    );

    /** Retry anchoring an approved publication (the anchor service is safe to call twice). */
    app.post('/publications/:id/anchor', { schema: { params: id } }, async (request) => {
      const caller = await requireStaff(deps, request, ['publisher']);
      const publication = unwrap(
        await deps
          .forUser(caller.token)
          .from('publications')
          .select('status')
          .eq('id', request.params.id)
          .maybeSingle(),
      );
      if (!publication) throw notFound();
      if (publication.status !== 'approved')
        throw new HttpError(409, 'workflow.illegal_transition');
      return { anchor: await deps.anchor(request.params.id) };
    });

    /** B14.07: invite with the admin key, then grant the role with the sysadmin's own session. */
    app.post(
      '/users/invite',
      {
        config: { rateLimit: { max: 10, timeWindow: '1 minute' } },
        schema: {
          body: z.strictObject({
            email: z.email().max(254),
            role: z.enum(STAFF_ROLES),
            jurisdiction_id: z.uuid().nullable().default(null),
          }),
        },
      },
      async (request, reply) => {
        const caller = await requireStaff(deps, request, ['sysadmin']);
        if (caller.email && caller.email.toLowerCase() === request.body.email.toLowerCase())
          throw forbidden('workflow.self_grant');
        const { data, error } = await deps.service.auth.admin.inviteUserByEmail(
          request.body.email,
          {
            redirectTo: `${deps.config.appOrigin}/auth/callback?next=/en/ops/mfa`,
          },
        );
        if (error || !data.user) throw new HttpError(502, 'auth.invite_failed');
        const assignment = unwrap(
          await deps.forUser(caller.token).rpc('grant_role', {
            p_user: data.user.id,
            p_role: request.body.role,
            p_jurisdiction: request.body.jurisdiction_id ?? sqlNull,
          }),
        );
        return reply.status(201).send({ user_id: data.user.id, assignment });
      },
    );

    /** B15.10: put a failed or dead job back in the queue. */
    app.post('/jobs/:id/retry', { schema: { params: id } }, async (request) => {
      const caller = await requireStaff(deps, request, ['sysadmin', 'analyst', 'data_steward']);
      const { data, error } = await deps.service
        .from('jobs')
        .update({
          status: 'queued',
          attempts: 0,
          run_after: new Date().toISOString(),
          last_error: null,
        })
        .eq('id', request.params.id)
        .in('status', ['failed', 'dead'])
        .select('id, kind')
        .maybeSingle();
      if (error) throw new HttpError(502, 'database.unavailable');
      if (!data) throw new HttpError(409, 'workflow.illegal_transition');
      await deps.service.from('audit_log').insert({
        actor_id: caller.userId,
        actor_roles: caller.roles.map((r) => r.role),
        action: 'job.retry',
        target_type: 'job',
        target_id: data.id,
      });
      return { id: data.id, status: 'queued' };
    });
  };
