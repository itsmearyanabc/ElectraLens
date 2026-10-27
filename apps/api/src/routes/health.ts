import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';

import type { Deps } from '../deps.ts';

/** B07.13: liveness and readiness. Readiness checks the database and storage are reachable. */
export const healthRoutes =
  (deps: Deps): FastifyPluginAsyncZod =>
  async (app) => {
    app.get('/health', { schema: { hide: true } }, () => ({ ok: true }));
    app.get('/ready', { schema: { hide: true } }, async (_request, reply) => {
      const [db, storage] = await Promise.all([
        deps.anon.from('jurisdictions').select('id', { head: true, count: 'exact' }).limit(1),
        deps.service.storage.from('public-artifacts').list('', { limit: 1 }),
      ]);
      const ok = !db.error && !storage.error;
      return reply
        .status(ok ? 200 : 503)
        .send({ ok, database: !db.error, storage: !storage.error });
    });
  };
