'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { isLocale } from '@/i18n/routing';
import { currentUser } from '@/lib/auth';
import { isAreaCode, isUuid } from '@/lib/data/public';
import { env } from '@/lib/env';
import { sessionDb } from '@/lib/supabase/server';

export type FormState = { status: 'idle' | 'ok' | 'error'; message?: string; email?: string };

const EMAIL = /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,}$/;
const localeOf = (form: FormData) => {
  const value = form.get('locale');
  return isLocale(value) ? value : 'en';
};

export async function sendMagicLink(_previous: FormState, form: FormData): Promise<FormState> {
  const email = String(form.get('email') ?? '')
    .trim()
    .toLowerCase();
  if (!EMAIL.test(email)) return { status: 'error', message: 'invalidEmail' };
  const locale = localeOf(form);
  const db = await sessionDb();
  const { error } = await db.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${env.appOrigin()}/auth/callback?next=/${locale}/account`,
      shouldCreateUser: true,
    },
  });
  if (error) return { status: 'error', message: error.status === 429 ? 'rateLimited' : 'failed' };
  return { status: 'ok', email };
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
