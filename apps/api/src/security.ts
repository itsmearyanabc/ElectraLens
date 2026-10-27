import type { FastifyRequest } from 'fastify';

import type { Deps } from './deps.ts';

/** B07.11: security events carry a salted IP hash, never the IP itself. */
export async function recordSecurityEvent(
  deps: Deps,
  request: FastifyRequest,
  eventType: string,
  details: Record<string, unknown> = {},
) {
  const { error } = await deps.service.from('security_events').insert({
    event_type: eventType,
    ip_hash: deps.hashIp(request.ip),
    details: { ...details, route: request.routeOptions.url ?? null },
  });
  if (error) request.log.warn({ eventType }, 'could not record security event');
}
