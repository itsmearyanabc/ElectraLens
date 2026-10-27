import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';

import { requireUser } from '../auth.ts';
import type { Deps } from '../deps.ts';
import { fromDatabase, HttpError } from '../errors.ts';

// B07.07 / B14: a person's own data, always read and written with their own token so RLS
// limits every query to their rows.

type Data<R> = R extends { data: infer D } ? D : never;

/** The rows of a Supabase response, or an HTTP error carrying the database's code. */
function unwrap<R extends { data: unknown; error: { message: string } | null }>(
  result: R,
): Data<R> {
  if (result.error) throw fromDatabase(result.error.message);
  return result.data as Data<R>;
}

export const meRoutes =
  (deps: Deps): FastifyPluginAsyncZod =>
  async (app) => {
    app.addHook('onSend', async (_request, reply) => {
      reply.header('cache-control', 'private, no-store');
    });

    app.get('/me', async (request) => {
      const caller = await requireUser(deps, request);
      const profile = unwrap(
        await deps
          .forUser(caller.token)
          .from('profiles')
          .select('display_name, preferred_language, notify_email, created_at')
          .eq('user_id', caller.userId)
          .maybeSingle(),
      );
      return {
        id: caller.userId,
        email: caller.email,
        profile,
        staff_roles: caller.roles.map((r) => r.role),
      };
    });

    app.patch(
      '/me',
      {
        schema: {
          body: z.strictObject({
            display_name: z.string().trim().max(80).nullable().optional(),
            preferred_language: z.enum(['en', 'hi']).optional(),
            notify_email: z.boolean().optional(),
          }),
        },
      },
      async (request) => {
        const caller = await requireUser(deps, request);
        unwrap(
          await deps
            .forUser(caller.token)
            .from('profiles')
            .update(request.body)
            .eq('user_id', caller.userId),
        );
        return { ok: true };
      },
    );

    /** B14.06: unpublished claims, then the sign-in itself (which cascades to profile, saved, follows). */
    app.delete(
      '/me',
      { config: { rateLimit: { max: 5, timeWindow: '1 minute' } } },
      async (request, reply) => {
        const caller = await requireUser(deps, request);
        if (caller.roles.length > 0) throw new HttpError(409, 'account.staff_cannot_self_delete');
        unwrap(await deps.forUser(caller.token).rpc('delete_own_unpublished_claims'));
        const { error } = await deps.service.auth.admin.deleteUser(caller.userId);
        if (error) throw new HttpError(502, 'auth.unavailable');
        return reply.status(204).send();
      },
    );

    const itemType = z.enum(['publication', 'finding', 'booth']);
    app.get('/me/saved', async (request) => {
      const caller = await requireUser(deps, request);
      return unwrap(
        await deps
          .forUser(caller.token)
          .from('saved_items')
          .select('id, item_type, item_id, created_at'),
      );
    });
    app.post(
      '/me/saved',
      { schema: { body: z.strictObject({ item_type: itemType, item_id: z.string().max(64) }) } },
      async (request, reply) => {
        const caller = await requireUser(deps, request);
        unwrap(
          await deps
            .forUser(caller.token)
            .from('saved_items')
            .insert({ user_id: caller.userId, ...request.body }),
        );
        return reply.status(201).send({ ok: true });
      },
    );
    app.delete(
      '/me/saved/:id',
      { schema: { params: z.object({ id: z.uuid() }) } },
      async (request, reply) => {
        const caller = await requireUser(deps, request);
        unwrap(
          await deps.forUser(caller.token).from('saved_items').delete().eq('id', request.params.id),
        );
        return reply.status(204).send();
      },
    );

    app.get('/me/subscriptions', async (request) => {
      const caller = await requireUser(deps, request);
      return unwrap(
        await deps
          .forUser(caller.token)
          .from('user_subscriptions')
          .select('id, target_type, target_id, created_at'),
      );
    });
    app.post(
      '/me/subscriptions',
      {
        schema: {
          body: z.strictObject({
            target_type: z.enum(['jurisdiction', 'series']),
            target_id: z.string().max(64),
          }),
        },
      },
      async (request, reply) => {
        const caller = await requireUser(deps, request);
        unwrap(
          await deps
            .forUser(caller.token)
            .from('user_subscriptions')
            .insert({ user_id: caller.userId, ...request.body }),
        );
        return reply.status(201).send({ ok: true });
      },
    );
    app.delete(
      '/me/subscriptions/:id',
      { schema: { params: z.object({ id: z.uuid() }) } },
      async (request, reply) => {
        const caller = await requireUser(deps, request);
        unwrap(
          await deps
            .forUser(caller.token)
            .from('user_subscriptions')
            .delete()
            .eq('id', request.params.id),
        );
        return reply.status(204).send();
      },
    );

    app.get('/me/claims', async (request) => {
      const caller = await requireUser(deps, request);
      return unwrap(
        await deps
          .forUser(caller.token)
          .from('claim_submissions')
          .select('id, text, status, created_at, claim_assessments(verdict)')
          .eq('submitter_id', caller.userId)
          .order('created_at', { ascending: false }),
      );
    });
  };
