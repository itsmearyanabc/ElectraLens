'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { isLocale } from '@/i18n/routing';
import type { Enums, Json } from '@/lib/data/types';
import { sessionDb } from '@/lib/supabase/server';

export type OpsState = { status: 'idle' | 'ok' | 'error'; message?: string; id?: string };

const localeOf = (form: FormData) => {
  const value = form.get('locale');
  return isLocale(value) ? value : 'en';
};
const text = (form: FormData, key: string, max = 2000) =>
  String(form.get(key) ?? '')
    .trim()
    .slice(0, max);

/** "workflow.same_person" → the message key "workflow_same_person" (message keys can't contain dots). */
function errorKey(message: string | undefined): string {
  const code = (message ?? '').match(/^[a-z_]+\.[a-z_]+/)?.[0];
  return code ? code.replace('.', '_') : 'generic';
}

export async function staffSignIn(_previous: OpsState, form: FormData): Promise<OpsState> {
  const db = await sessionDb();
  const { error } = await db.auth.signInWithPassword({
    email: text(form, 'email', 254),
    password: String(form.get('password') ?? ''),
  });
  if (error) return { status: 'error', message: 'failed' };
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
    case 'approve_publication':
      result = await db.rpc('approve_publication', {
        p_id: id,
        p_step: text(form, 'step', 20) as Enums['approval_step'],
        p_manifest_hash: text(form, 'manifest_hash', 64),
        p_decision: text(form, 'decision', 10) || 'approve',
        p_reason: reason,
      });
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
