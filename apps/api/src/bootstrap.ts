// Creates (or updates) the staff accounts named in the server's environment. Credentials are read
// from the environment only: never from the repository, a command line or a log. Run on the VPS:
//
//   node --env-file=/etc/electralens/electralens.env apps/api/dist/bootstrap.js
//
// ELECTRALENS_ADMIN_EMAIL / ELECTRALENS_ADMIN_PASSWORD   the system administrator (required)
// ELECTRALENS_<ROLE>_EMAIL / ELECTRALENS_<ROLE>_PASSWORD optional demo staff, one per role:
//   DATA_STEWARD, ANALYST, REVIEWER, PUBLISHER, SECURITY_AUDITOR
//
// Every account must set up an authenticator app (TOTP) at its first sign-in to the console.
// This is the one place roles are granted without grant_role(): there is no administrator yet to
// grant them, so each grant is written to the audit log as a bootstrap.
import { createClient } from '@supabase/supabase-js';

import { loadConfig } from './config.ts';

const ROLES = [
  'admin',
  'data_steward',
  'analyst',
  'reviewer',
  'publisher',
  'security_auditor',
] as const;
const MIN_PASSWORD = 14; // B14.08

function account(role: (typeof ROLES)[number]) {
  const key = role === 'admin' ? 'ADMIN' : role.toUpperCase();
  const email = process.env[`ELECTRALENS_${key}_EMAIL`]?.trim().toLowerCase();
  const password = process.env[`ELECTRALENS_${key}_PASSWORD`];
  if (!email && !password) return null;
  if (!email || !password)
    throw new Error(`set both ELECTRALENS_${key}_EMAIL and ELECTRALENS_${key}_PASSWORD`);
  if (password.length < MIN_PASSWORD)
    throw new Error(`ELECTRALENS_${key}_PASSWORD must be at least ${MIN_PASSWORD} characters`);
  return { email, password, role: role === 'admin' ? 'sysadmin' : role };
}

const config = loadConfig();
const db = createClient(config.supabaseUrl, config.secretKey, { auth: { persistSession: false } });
const wanted = ROLES.map(account).filter((a) => a !== null);
if (!wanted.some((a) => a.role === 'sysadmin'))
  throw new Error('ELECTRALENS_ADMIN_EMAIL and ELECTRALENS_ADMIN_PASSWORD are required');

const { data: list, error: listError } = await db.auth.admin.listUsers({ perPage: 1000 });
if (listError) throw listError;

for (const person of wanted) {
  let user = list.users.find((u) => u.email?.toLowerCase() === person.email);
  if (user) {
    // Keep the environment authoritative: changing the password there and re-running updates it.
    const { error } = await db.auth.admin.updateUserById(user.id, { password: person.password });
    if (error) throw error;
  } else {
    const { data, error } = await db.auth.admin.createUser({
      email: person.email,
      password: person.password,
      email_confirm: true,
    });
    if (error || !data.user) throw error ?? new Error('could not create user');
    user = data.user;
  }
  const { data: existing } = await db
    .from('staff_assignments')
    .select('id')
    .eq('user_id', user.id)
    .eq('role', person.role as never)
    .is('revoked_at', null)
    .maybeSingle();
  if (!existing) {
    const { error } = await db
      .from('staff_assignments')
      .insert({ user_id: user.id, role: person.role as never });
    if (error) throw error;
    await db.from('audit_log').insert({
      actor_id: null,
      action: 'staff.bootstrap_grant',
      target_type: 'user',
      target_id: user.id,
      details: { role: person.role },
    });
  }
  // The email is printed so the operator can confirm; the password never is.
  console.log(
    `${person.role.padEnd(16)} ${person.email}  ${existing ? 'already set up' : 'role granted'}`,
  );
}
console.log('done. Each account sets up its authenticator app at its first console sign-in.');
