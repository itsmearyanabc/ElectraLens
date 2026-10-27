import { CLAIM_METRICS, CLAIM_TYPES, COMPARATORS, evaluate, type Claim } from '@electralens/claims';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';

import { authenticate } from '../auth.ts';
import type { Deps } from '../deps.ts';
import { forbidden, HttpError, sqlNull } from '../errors.ts';
import { recordSecurityEvent } from '../security.ts';

const claimSchema = z.strictObject({
  area_code: z
    .string()
    .regex(/^[A-Z0-9]+(-[A-Z0-9]+)*$/)
    .max(64),
  metric: z.enum(CLAIM_METRICS),
  comparator: z.enum(COMPARATORS),
  value: z.number().int().min(-1e9).max(1e9),
  claim_type: z.enum(CLAIM_TYPES),
});

const EXPLANATION = {
  checked: {
    en: 'Compared with the published figure for this area and measure.',
    hi: 'इस क्षेत्र और माप के प्रकाशित आँकड़े से तुलना की गई।',
  },
  cause_or_intent: {
    en: 'Roll data records how many names changed, not why or with what intent. A claim about cause or intent cannot be established from it.',
    hi: 'सूची के डेटा में यह दर्ज होता है कि कितने नाम बदले, यह नहीं कि क्यों या किस इरादे से। कारण या इरादे का दावा इससे स्थापित नहीं हो सकता।',
  },
  missing: {
    en: 'No published figure covers this claim.',
    hi: 'इस दावे के लिए कोई प्रकाशित आँकड़ा नहीं है।',
  },
} as const;

export const claimRoutes =
  (deps: Deps): FastifyPluginAsyncZod =>
  async (app) => {
    async function check(claim: Claim) {
      if (claim.claimType === 'cause_or_intent')
        return evaluate(claim, { publication: null, areaFound: false, cell: null });
      const latest = await deps.anon
        .from('publications')
        .select('id, series_id, sequence')
        .eq('status', 'published')
        .order('published_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (latest.error) throw new HttpError(502, 'database.unavailable');
      const area = latest.data
        ? (
            await deps.anon
              .from('jurisdictions')
              .select('id')
              .eq('code', claim.areaCode)
              .maybeSingle()
          ).data
        : null;
      const cell =
        latest.data && area
          ? (
              await deps.anon
                .from('aggregate_metrics')
                .select('value, suppressed')
                .eq('publication_id', latest.data.id)
                .eq('jurisdiction_id', area.id)
                .eq('metric', claim.metric)
                .eq('dims', '{}')
                .maybeSingle()
            ).data
          : null;
      return evaluate(claim, {
        publication: latest.data
          ? { id: latest.data.id, series: latest.data.series_id, sequence: latest.data.sequence }
          : null,
        areaFound: area !== null,
        cell,
      });
    }

    const toClaim = (c: z.infer<typeof claimSchema>): Claim => ({
      areaCode: c.area_code,
      metric: c.metric,
      comparator: c.comparator,
      value: c.value,
      claimType: c.claim_type,
    });

    async function turnstile(
      request: Parameters<typeof recordSecurityEvent>[1],
      token: string | undefined,
      action: string,
    ) {
      if (!(await deps.verifyTurnstile(token, request.ip, action))) {
        await recordSecurityEvent(deps, request, 'turnstile.failed', { action });
        throw forbidden('turnstile.failed');
      }
    }

    const strict = { config: { rateLimit: { max: 10, timeWindow: '1 minute' } } };

    /** Read-only check: nothing is stored. */
    app.post(
      '/claims/check',
      {
        ...strict,
        schema: {
          body: z.strictObject({
            claim: claimSchema,
            turnstile_token: z.string().max(2048).optional(),
          }),
        },
      },
      async (request) => {
        await turnstile(request, request.body.turnstile_token, 'claim_check');
        return check(toClaim(request.body.claim));
      },
    );

    /** B11.05: submissions go to moderation and are never published automatically. */
    app.post(
      '/claims',
      {
        ...strict,
        schema: {
          body: z.strictObject({
            claim: claimSchema,
            text: z.string().trim().min(5).max(2000),
            language: z.enum(['en', 'hi']),
            turnstile_token: z.string().max(2048).optional(),
          }),
        },
      },
      async (request, reply) => {
        await turnstile(request, request.body.turnstile_token, 'claim_submit');
        const caller = await authenticate(deps, request);
        const result = await check(toClaim(request.body.claim));
        const explanation =
          result.reason === 'checked'
            ? EXPLANATION.checked
            : result.reason === 'cause_or_intent'
              ? EXPLANATION.cause_or_intent
              : EXPLANATION.missing;
        const { data, error } = await deps.service.rpc('submit_claim', {
          p_submitter: caller?.userId ?? sqlNull,
          p_text: request.body.text,
          p_structured: request.body.claim,
          p_language: request.body.language,
          p_ip_hash: deps.hashIp(request.ip),
          p_verdict: result.verdict,
          p_evidence: {
            area_code: request.body.claim.area_code,
            metric: request.body.claim.metric,
            published_value: result.published,
            tolerance: result.tolerance,
          },
          p_publication: result.publicationId ?? sqlNull,
          p_method_version: result.method,
          p_explanation: explanation,
          p_for_moderation: true,
        });
        if (error) throw new HttpError(502, 'database.unavailable');
        return reply.status(201).send({ id: data as string, status: 'in_moderation', result });
      },
    );
  };
