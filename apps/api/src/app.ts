import rateLimit from '@fastify/rate-limit';
import swagger from '@fastify/swagger';
import Fastify from 'fastify';
import {
  jsonSchemaTransform,
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from 'fastify-type-provider-zod';

import type { Deps } from './deps.ts';
import { errorHandler, problem } from './errors.ts';
import { claimRoutes } from './routes/claims.ts';
import { healthRoutes } from './routes/health.ts';
import { meRoutes } from './routes/me.ts';
import { publicRoutes } from './routes/public.ts';
import { staffRoutes } from './routes/staff.ts';
import { recordSecurityEvent } from './security.ts';

export async function buildApp(deps: Deps, options: { logger?: boolean } = {}) {
  const app = Fastify({
    trustProxy: true, // behind nginx on the VPS
    bodyLimit: 64 * 1024,
    genReqId: () => crypto.randomUUID(),
    logger:
      options.logger === false
        ? false
        : {
            // NFR-11: no personal data in logs. Paths only (booth and search query strings never
            // logged, B13.08), no IPs, no tokens, no cookies.
            redact: ['req.headers.authorization', 'req.headers.cookie', 'body.email', 'body.text'],
            serializers: {
              req: (req: { method: string; url: string; id: string }) => ({
                id: req.id,
                method: req.method,
                path: req.url.split('?')[0],
              }),
            },
          },
  }).withTypeProvider<ZodTypeProvider>();

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);
  app.setErrorHandler(errorHandler);
  app.setNotFoundHandler((request, reply) => problem(reply, request, 404, 'not_found'));

  await app.register(swagger, {
    openapi: {
      info: {
        title: 'ElectraLens API',
        version: '1.0.0',
        description:
          'Independent, open electoral-roll analysis. Not affiliated with the Election Commission of India.',
      },
    },
    transform: jsonSchemaTransform,
  });

  // B07.04: 120 requests a minute per IP by default; stricter limits are set per route.
  await app.register(rateLimit, {
    max: 120,
    timeWindow: '1 minute',
    keyGenerator: (request) => request.ip,
    onExceeded: (request) => void recordSecurityEvent(deps, request, 'rate_limit.exceeded'),
  });

  await app.register(healthRoutes(deps));
  await app.register(publicRoutes(deps), { prefix: '/api/v1' });
  await app.register(claimRoutes(deps), { prefix: '/api/v1' });
  await app.register(meRoutes(deps), { prefix: '/api/v1' });
  await app.register(staffRoutes(deps), { prefix: '/api/v1/staff' });
  app.get('/api/v1/openapi.json', { schema: { hide: true } }, () => app.swagger());
  return app;
}

export type App = Awaited<ReturnType<typeof buildApp>>;
