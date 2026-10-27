import 'server-only';

import type { User } from '@supabase/supabase-js';
import { cache } from 'react';

import { redirect } from '@/i18n/navigation';

import type { Enums } from './data/types';
import { safeNext } from './redirects';
import { sessionDb } from './supabase/server';

export { safeNext };

/** The signed-in user, checked with the auth server (not just read from the cookie). */
export const currentUser = cache(async (): Promise<User | null> => {
  const db = await sessionDb();
  const { data } = await db.auth.getUser();
  return data.user ?? null;
});

export async function requireUser(locale: string): Promise<User> {
  const user = await currentUser();
  if (!user) redirect({ href: '/account/sign-in', locale });
  return user as User;
}

export interface StaffRole {
  id: string;
  role: Enums['staff_role'];
  jurisdiction_id: string | null;
}

export interface StaffSession {
  user: User;
  roles: StaffRole[];
  has: (...roles: Enums['staff_role'][]) => boolean;
}

/**
 * Console pages: signed in, second factor verified (aal2), and at least one active role. The
 * roles only shape the page; the database functions and RLS enforce every permission (B15.01).
 */
export const requireStaff = cache(async (locale: string): Promise<StaffSession> => {
  const db = await sessionDb();
  const user = await currentUser();
  if (!user) redirect({ href: '/ops/login', locale });
  const { data: aal } = await db.auth.mfa.getAuthenticatorAssuranceLevel();
  if (aal?.currentLevel !== 'aal2') redirect({ href: '/ops/mfa', locale });
  const { data } = await db
    .from('staff_assignments')
    .select('id, role, jurisdiction_id')
    .eq('user_id', (user as User).id)
    .is('revoked_at', null);
  const roles = (data ?? []) as StaffRole[];
  if (roles.length === 0) redirect({ href: '/ops/login?error=not_staff', locale });
  return {
    user: user as User,
    roles,
    has: (...wanted) => roles.some((r) => wanted.includes(r.role)),
  };
});
