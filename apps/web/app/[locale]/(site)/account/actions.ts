'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { isLocale } from '@/i18n/routing';
import { currentUser } from '@/lib/auth';
import { isAreaCode, isUuid } from '@/lib/data/public';
import { env } from '@/lib/env';
import { sessionDb } from '@/lib/supabase/server';
import { turnstileOk } from '@/lib/turnstile';

export type FormState = { status: 'idle' | 'ok' | 'error'; message?: string; email?: string };

const EMAIL = /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,}$/;
const localeOf = (form: FormData) => {
  const value = form.get('locale');
  return isLocale(value) ? value : 'en';
};

const CODE = /^[0-9]{6,10}$/;
const emailOf = (form: FormData) =>
  String(form.get('email') ?? '')
    .trim()
    .toLowerCase();

/** What sign-up asks for, carried from the first step to the code step. Never a voter ID. */
export interface SignUpDetails {
  name: string;
  language: string;
  area: string;
  notify: boolean;
}

export type CodeState = FormState & { details?: SignUpDetails };

async function sendCode(
  email: string,
  locale: string,
  createUser: boolean,
  data?: Record<string, string>,
) {
  const db = await sessionDb();
  return db.auth.signInWithOtp({
    email,
    options: {
      // Older emails with a link still work through the callback; new ones carry a code.
      emailRedirectTo: `${env.appOrigin()}/auth/callback?next=/${locale}/account`,
      shouldCreateUser: createUser,
      data,
    },
  });
}

/** Sign in: emails a one-time code, for an account that already exists. */
export async function sendSignInCode(_previous: FormState, form: FormData): Promise<FormState> {
  const email = emailOf(form);
  if (!EMAIL.test(email)) return { status: 'error', message: 'invalidEmail' };
  if (!(await turnstileOk(form, 'sign_in'))) return { status: 'error', message: 'notHuman' };
  const { error } = await sendCode(email, localeOf(form), false);
  if (error) {
    // With sign-ups off for this call, an unknown email comes back as "signups not allowed".
    if (error.code === 'otp_disabled' || /signup/i.test(error.message)) {
      return { status: 'error', message: 'noAccount' };
    }
    return { status: 'error', message: error.status === 429 ? 'rateLimited' : 'failed' };
  }
  return { status: 'ok', email };
}

/** Sign up: checks the details, then emails a one-time code that creates the account. */
export async function sendSignUpCode(_previous: CodeState, form: FormData): Promise<CodeState> {
  const email = emailOf(form);
  const name = String(form.get('name') ?? '')
    .trim()
    .replace(/\s+/g, ' ');
  const language = form.get('language');
  const area = String(form.get('area') ?? '');
  const details: SignUpDetails = {
    name,
    language: isLocale(language) ? language : 'en',
    area: isAreaCode(area) ? area : '',
    notify: form.get('notify') === 'on',
  };
  if (name.length < 2 || name.length > 80) {
    return { status: 'error', message: 'nameInvalid', details };
  }
  if (!EMAIL.test(email)) return { status: 'error', message: 'invalidEmail', details };
  if (form.get('consent') !== 'on') return { status: 'error', message: 'consentRequired', details };
  if (!(await turnstileOk(form, 'sign_up'))) {
    return { status: 'error', message: 'notHuman', details };
  }
  const { error } = await sendCode(email, localeOf(form), true, {
    display_name: details.name,
    preferred_language: details.language,
  });
  if (error) {
    return {
      status: 'error',
      message: error.status === 429 ? 'rateLimited' : 'failed',
      details,
    };
  }
  return { status: 'ok', email, details };
}

type Verified =
  | { ok: true; db: Awaited<ReturnType<typeof sessionDb>>; userId: string }
  | { ok: false; email: string; message: string };

async function verify(form: FormData): Promise<Verified> {
  const email = emailOf(form);
  const token = String(form.get('code') ?? '').replace(/\s+/g, '');
  if (!EMAIL.test(email)) return { ok: false, email, message: 'invalidEmail' };
  if (!CODE.test(token)) return { ok: false, email, message: 'wrongCode' };
  const db = await sessionDb();
  const { data, error } = await db.auth.verifyOtp({ email, token, type: 'email' });
  if (error || !data.user) {
    return { ok: false, email, message: error?.status === 429 ? 'rateLimited' : 'wrongCode' };
  }
  return { ok: true, db, userId: data.user.id };
}

/** Checks the emailed code and signs the person in. */
export async function verifySignInCode(_previous: FormState, form: FormData): Promise<FormState> {
  const result = await verify(form);
  if (!result.ok) return { status: 'ok', email: result.email, message: result.message };
  redirect(`/${localeOf(form)}/account`);
}

/** Checks the code, then saves the sign-up details: profile, and the home area followed. */
export async function verifySignUpCode(_previous: CodeState, form: FormData): Promise<CodeState> {
  const result = await verify(form);
  if (!result.ok) return { status: 'ok', email: result.email, message: result.message };
  const { db, userId } = result;
  const language = form.get('language');
  await db
    .from('profiles')
    .update({
      display_name:
        String(form.get('name') ?? '')
          .trim()
          .slice(0, 80) || null,
      preferred_language: isLocale(language) ? language : 'en',
      notify_email: form.get('notify') === 'true',
    })
    .eq('user_id', userId);
  const area = String(form.get('area') ?? '');
  if (isAreaCode(area)) {
    const { data: row } = await db
      .from('jurisdictions')
      .select('id')
      .eq('code', area)
      .maybeSingle();
    if (row) {
      await db
        .from('user_subscriptions')
        .upsert(
          { user_id: userId, target_type: 'jurisdiction', target_id: row.id },
          { onConflict: 'user_id,target_type,target_id', ignoreDuplicates: true },
        );
    }
  }
  redirect(`/${isLocale(language) ? language : localeOf(form)}/account?welcome=1`);
}

export async function signInWithGoogle(form: FormData): Promise<void> {
  const locale = localeOf(form);
  const db = await sessionDb();
  const { data, error } = await db.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: `${env.appOrigin()}/auth/callback?next=/${locale}/account` },
  });
  redirect(error || !data.url ? `/${locale}/account/sign-in?error=failed` : data.url);
}

export async function updateProfile(_previous: FormState, form: FormData): Promise<FormState> {
  const user = await currentUser();
  if (!user) return { status: 'error', message: 'failed' };
  const language = form.get('preferred_language');
  const db = await sessionDb();
  const { error } = await db
    .from('profiles')
    .update({
      display_name:
        String(form.get('display_name') ?? '')
          .trim()
          .slice(0, 80) || null,
      preferred_language: isLocale(language) ? language : 'en',
      notify_email: form.get('notify_email') === 'on',
    })
    .eq('user_id', user.id);
  return error ? { status: 'error', message: 'failed' } : { status: 'ok' };
}

export async function removeSavedItem(form: FormData): Promise<void> {
  const id = String(form.get('id') ?? '');
  if (!isUuid(id)) return;
  const db = await sessionDb();
  await db.from('saved_items').delete().eq('id', id);
  revalidatePath('/[locale]/account/saved', 'page');
}

export async function unfollow(form: FormData): Promise<void> {
  const id = String(form.get('id') ?? '');
  if (!isUuid(id)) return;
  const db = await sessionDb();
  await db.from('user_subscriptions').delete().eq('id', id);
  revalidatePath('/[locale]/account/subscriptions', 'page');
}

export async function followArea(form: FormData): Promise<void> {
  const user = await currentUser();
  const code = String(form.get('area') ?? '');
  if (!user || !isAreaCode(code)) return;
  const db = await sessionDb();
  const { data: area } = await db.from('jurisdictions').select('id').eq('code', code).maybeSingle();
  if (area) {
    await db
      .from('user_subscriptions')
      .insert({ user_id: user.id, target_type: 'jurisdiction', target_id: area.id });
  }
  revalidatePath('/[locale]/account/subscriptions', 'page');
}

/** B14.06: deletion runs in the API, which holds the key that can remove the sign-in itself. */
export async function deleteAccount(_previous: FormState, form: FormData): Promise<FormState> {
  if (form.get('confirm') !== 'DELETE') return { status: 'error', message: 'confirm' };
  const api = env.apiInternalUrl();
  const db = await sessionDb();
  const { data } = await db.auth.getSession();
  if (!api || !data.session) return { status: 'error', message: 'unavailable' };
  try {
    const response = await fetch(`${api}/api/v1/me`, {
      method: 'DELETE',
      headers: { authorization: `Bearer ${data.session.access_token}` },
    });
    if (!response.ok) return { status: 'error', message: 'unavailable' };
  } catch {
    return { status: 'error', message: 'unavailable' };
  }
  await db.auth.signOut({ scope: 'local' });
  redirect(`/${localeOf(form)}?deleted=1`);
}
