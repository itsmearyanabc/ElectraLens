// B07.02–B07.03: who is calling, at what assurance level, with which active roles.
import type { FastifyRequest } from 'fastify';

import type { Deps } from './deps.ts';
import { forbidden, unauthorized } from './errors.ts';

export const STAFF_ROLES = [
  'sysadmin',
  'data_steward',
  'analyst',
  'reviewer',
  'publisher',
  'security_auditor',
] as const;
export type StaffRole = (typeof STAFF_ROLES)[number];

export interface Caller {
  userId: string;
  email: string | null;
  token: string;
  aal: string;
  roles: { id: string; role: StaffRole; jurisdiction_id: string | null }[];
}

function bearer(request: FastifyRequest): string | null {
  const header = request.headers.authorization;
  if (!header?.startsWith('Bearer ')) return null;
  const token = header.slice(7).trim();
  return token.length > 0 && token.length < 8192 ? token : null;
}

/** The token is checked with the auth server; only then are its claims read. */
export async function authenticate(deps: Deps, request: FastifyRequest): Promise<Caller | null> {
  const token = bearer(request);
  if (!token) return null;
  const { data, error } = await deps.service.auth.getUser(token);
  if (error || !data.user) throw unauthorized('auth.invalid');
  let aal: string;
  try {
    const payload = JSON.parse(
      Buffer.from(token.split('.')[1] ?? '', 'base64url').toString('utf8'),
    ) as { aal?: string };
    aal = payload.aal ?? 'aal1';
  } catch {
    throw unauthorized('auth.invalid');
  }
  // Read on every request, so a revoked role stops working immediately (B14.09).
  const { data: roles } = await deps.service
    .from('staff_assignments')
    .select('id, role, jurisdiction_id')
    .eq('user_id', data.user.id)
    .is('revoked_at', null);
  return {
    userId: data.user.id,
    email: data.user.email ?? null,
    token,
    aal,
    roles: (roles ?? []) as Caller['roles'],
  };
}

export async function requireUser(deps: Deps, request: FastifyRequest): Promise<Caller> {
  const caller = await authenticate(deps, request);
  if (!caller) throw unauthorized();
  return caller;
}

/** Staff routes: a matching role and a verified second factor (B14.08). */
export async function requireStaff(
  deps: Deps,
  request: FastifyRequest,
  roles: readonly StaffRole[] = STAFF_ROLES,
): Promise<Caller> {
  const caller = await requireUser(deps, request);
  if (!caller.roles.some((r) => roles.includes(r.role))) throw forbidden();
  if (caller.aal !== 'aal2') throw forbidden('auth.mfa_required');
  return caller;
}
