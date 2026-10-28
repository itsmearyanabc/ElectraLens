'use server';

import { createHash } from 'node:crypto';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { isLocale } from '@/i18n/routing';
import type { Enums, Json } from '@/lib/data/types';
import { callApi, type ApiResult } from '@/lib/api';
import { sessionDb } from '@/lib/supabase/server';
import { turnstileOk } from '@/lib/turnstile';

export type OpsState = {
  status: 'idle' | 'ok' | 'error';
  message?: string;
  id?: string;
  /** Seconds until the next sign-in attempt is allowed. */
  wait?: number;
};

const localeOf = (form: FormData) => {
  const value = form.get('locale');
  return isLocale(value) ? value : 'en';
};
const text = (form: FormData, key: string, max = 2000) =>
  String(form.get(key) ?? '')
    .trim()
    .slice(0, max);

/** An API reply in the same shape as a database call, so errors map to the same messages. */
function fromApi(reply: ApiResult<unknown>): { data: unknown; error: { message: string } | null } {
  return reply.ok
    ? { data: reply.data, error: null }
    : { data: null, error: { message: reply.code } };
}

/** "workflow.same_person" → the message key "workflow_same_person" (message keys can't contain dots). */
function errorKey(message: string | undefined): string {
  const code = (message ?? '').match(/^[a-z_]+\.[a-z_]+/)?.[0];
  return code ? code.replace('.', '_') : 'generic';
}

/**
 * Staff password sign-in behind Turnstile and an escalating lockout kept in the database (3 tries
 * then 30 s, 2 then 1 min, 1 then 5 min, then 1 at a time with the wait doubling). The lock is
 * checked before the password is tried, so a locked account gives nothing away.
 */
export async function staffSignIn(_previous: OpsState, form: FormData): Promise<OpsState> {
  const email = text(form, 'email', 254).toLowerCase();
  const key = createHash('sha256').update(email).digest('hex');
  const db = await sessionDb();
  const { data: waiting } = await db.rpc('login_throttle_wait', { p_key: key });
  if (waiting && waiting > 0) return { status: 'error', message: 'locked', wait: waiting };
  if (!(await turnstileOk(form, 'staff_sign_in'))) return { status: 'error', message: 'notHuman' };
  const { error } = await db.auth.signInWithPassword({
    email,
    password: String(form.get('password') ?? ''),
  });
  if (error) {
    const { data: locked } = await db.rpc('login_throttle_fail', { p_key: key });
    return locked && locked > 0
      ? { status: 'error', message: 'locked', wait: locked }
      : { status: 'error', message: 'failed' };
  }
  await db.rpc('login_throttle_clear');
  redirect(`/${localeOf(form)}/ops/mfa`);
}

export async function verifyMfa(_previous: OpsState, form: FormData): Promise<OpsState> {
  const code = text(form, 'code', 6);
  if (!/^[0-9]{6}$/.test(code)) return { status: 'error', message: 'failed' };
  const db = await sessionDb();
  const { error } = await db.auth.mfa.challengeAndVerify({
    factorId: text(form, 'factor', 64),
    code,
  });
  if (error) return { status: 'error', message: 'failed' };
  redirect(`/${localeOf(form)}/ops`);
}

/**
 * Every console action is one of these database functions, called with the staff member's own
 * session: the database checks the role, scope, aal2 and the two-person rule, and writes the
 * audit log in the same transaction (§5.3). The web server adds no permissions of its own.
 */
export async function runWorkflow(_previous: OpsState, form: FormData): Promise<OpsState> {
  const db = await sessionDb();
  const op = text(form, 'op', 40);
  const id = text(form, 'id', 64);
  const reason = text(form, 'reason');
  let result: { data: unknown; error: { message: string } | null };

  switch (op) {
    case 'approve_dataset':
      result = await db.rpc('approve_dataset_version', { p_id: id });
      break;
    case 'create_dataset': {
      const source = await db.rpc('create_data_source', {
        p_name: text(form, 'source_name', 200),
        p_publisher: text(form, 'publisher', 200),
        p_url: text(form, 'url', 500),
        p_basis: text(form, 'basis', 40) as Enums['permission_basis'],
        p_licence_note: text(form, 'licence', 500),
        p_is_synthetic: form.get('basis') === 'synthetic',
      });
      if (source.error) return { status: 'error', message: errorKey(source.error.message) };
      result = await db.rpc('create_dataset_version', {
        p_source: source.data as string,
        p_kind: text(form, 'kind', 40) as Enums['dataset_kind'],
        p_label: text(form, 'label', 120),
        p_jurisdiction: text(form, 'area', 64),
        p_qualifying_date: text(form, 'qualifying_date', 10),
        p_stage: text(form, 'stage', 20),
      });
      break;
    }
    case 'request_run':
      result = await db.rpc('request_audit_run', {
        p_baseline: text(form, 'baseline', 64),
        p_target: text(form, 'target', 64),
        p_methodology: text(form, 'methodology', 20),
      });
      break;
    case 'review_finding':
      result = await db.rpc('review_finding', {
        p_finding: id,
        p_decision: text(form, 'decision', 20) as Enums['review_decision'],
        p_reason: reason,
      });
      break;
    case 'create_publication':
      result = await db.rpc('create_publication', { p_run: text(form, 'run', 64) });
      break;
    // Through the API: once both approvals are in, it asks the anchor service to anchor.
    case 'approve_publication':
      result = fromApi(
        await callApi(`/staff/publications/${id}/approve`, {
          method: 'POST',
          body: {
            step: text(form, 'step', 20) as Enums['approval_step'],
            manifest_hash: text(form, 'manifest_hash', 64),
            decision: text(form, 'decision', 10) || 'approve',
            ...(reason ? { reason } : {}),
          },
        }),
      );
      break;
    case 'anchor_publication':
      result = fromApi(await callApi(`/staff/publications/${id}/anchor`, { method: 'POST' }));
      break;
    case 'invite_staff':
      result = fromApi(
        await callApi('/staff/users/invite', {
          method: 'POST',
          body: {
            email: text(form, 'email', 254),
            role: text(form, 'role', 40),
            jurisdiction_id: text(form, 'area', 64) || null,
          },
        }),
      );
      break;
    case 'retry_job':
      result = fromApi(await callApi(`/staff/jobs/${id}/retry`, { method: 'POST' }));
      break;
    case 'retract_publication':
      result = await db.rpc('retract_publication', { p_id: id, p_reason: reason });
      break;
    case 'moderate_claim':
      result = await db.rpc('moderate_claim', {
        p_claim: id,
        p_publish: form.get('publish') === 'true',
        p_reason: reason,
      });
      break;
    case 'create_methodology': {
      let params: Json;
      try {
        params = JSON.parse(text(form, 'params', 20000)) as Json;
      } catch {
        return { status: 'error', message: 'invalid_json' };
      }
      const bytes = new TextEncoder().encode(JSON.stringify(params));
      const digest = await crypto.subtle.digest('SHA-256', bytes);
      const hash = [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
      result = await db.rpc('create_methodology_draft', {
        p_version: text(form, 'version', 20),
        p_params: params,
        p_params_hash: hash,
        p_notes: text(form, 'notes'),
      });
      break;
    }
    case 'freeze_methodology':
      result = await db.rpc('freeze_methodology', { p_version: id });
      break;
    case 'publish_methodology':
      result = await db.rpc('publish_methodology', { p_version: id });
      break;
    case 'grant_role':
      result = await db.rpc('grant_role', {
        p_user: text(form, 'user', 64),
        p_role: text(form, 'role', 40) as Enums['staff_role'],
        p_jurisdiction: text(form, 'area', 64),
      });
      break;
    case 'revoke_role':
      result = await db.rpc('revoke_role', { p_assignment: id, p_reason: reason });
      break;
    default:
      return { status: 'error', message: 'generic' };
  }

  if (result.error) return { status: 'error', message: errorKey(result.error.message) };
  revalidatePath('/[locale]/ops', 'layout');
  return { status: 'ok', id: typeof result.data === 'string' ? result.data : undefined };
}
