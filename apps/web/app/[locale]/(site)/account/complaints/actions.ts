'use server';

import { createHmac, randomInt, timingSafeEqual } from 'node:crypto';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

import { isLocale } from '@/i18n/routing';
import type { ChatTurn } from '@/lib/ai/assistant';
import { intakeTurn, type IntakeReply } from '@/lib/ai/intake';
import { currentUser } from '@/lib/auth';
import { aadhaarShapeOk, isCategory } from '@/lib/complaints';
import { isAreaCode, isUuid } from '@/lib/data/public';
import { sessionDb } from '@/lib/supabase/server';

const localeOf = (form: FormData) => {
  const value = form.get('locale');
  return isLocale(value) ? value : 'en';
};

// ---- simulated e-KYC ----------------------------------------------------------------------
// No real Aadhaar check happens: there is no UIDAI or DigiLocker connection. The demo OTP is
// shown on the screen, and its hash travels in a short-lived signed cookie. The Aadhaar number
// is never stored or logged; only its last four digits are kept with the verification.

const EKYC_COOKIE = 'el_ekyc';
const secret = () => process.env.IP_HASH_SALT ?? 'local-development-only';
const sign = (payload: string) => createHmac('sha256', secret()).update(payload).digest('hex');

export type EkycState =
  | { status: 'idle' | 'error'; message?: string }
  | { status: 'otp'; demoOtp: string; last4: string; name: string; message?: string };

export async function startEkyc(_previous: EkycState, form: FormData): Promise<EkycState> {
  const user = await currentUser();
  if (!user) return { status: 'error', message: 'signIn' };
  const name = String(form.get('name') ?? '')
    .trim()
    .replace(/\s+/g, ' ');
  const aadhaar = String(form.get('aadhaar') ?? '').replace(/\s+/g, '');
  if (name.length < 2 || name.length > 80) return { status: 'error', message: 'nameInvalid' };
  if (!aadhaarShapeOk(aadhaar)) return { status: 'error', message: 'aadhaarInvalid' };
  if (form.get('consent') !== 'on') return { status: 'error', message: 'consentRequired' };
  const otp = String(randomInt(100000, 1000000));
  const last4 = aadhaar.slice(-4);
  const expires = Date.now() + 10 * 60_000;
  const payload = [user.id, name, last4, expires, sign(`${user.id}:${otp}`)].join('|');
  (await cookies()).set(
    EKYC_COOKIE,
    `${Buffer.from(payload).toString('base64url')}.${sign(payload)}`,
    {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 600,
      path: '/',
    },
  );
  return { status: 'otp', demoOtp: otp, last4, name };
}

export async function finishEkyc(_previous: EkycState, form: FormData): Promise<EkycState> {
  const user = await currentUser();
  if (!user) return { status: 'error', message: 'expired' };
  const otp = String(form.get('otp') ?? '').trim();
  const jar = await cookies();
  const [encoded, signature] = (jar.get(EKYC_COOKIE)?.value ?? '').split('.');
  const payload = Buffer.from(encoded ?? '', 'base64url').toString();
  const expected = Buffer.from(sign(payload));
  if (
    !signature ||
    expected.length !== signature.length ||
    !timingSafeEqual(expected, Buffer.from(signature))
  ) {
    return { status: 'error', message: 'expired' };
  }
  const [userId, name, last4, expires, otpHash] = payload.split('|');
  if (userId !== user.id || Number(expires) < Date.now() || !name || !last4) {
    return { status: 'error', message: 'expired' };
  }
  if (otpHash !== sign(`${user.id}:${otp}`)) return { status: 'error', message: 'otpWrong' };
  const db = await sessionDb();
  const { error } = await db.rpc('record_demo_verification', { p_name: name, p_last4: last4 });
  if (error) return { status: 'error', message: 'failed' };
  jar.delete(EKYC_COOKIE);
  redirect(`/${localeOf(form)}/account/complaints?verified=1`);
}

// ---- intake chat and filing ---------------------------------------------------------------

export async function askIntake(turns: ChatTurn[], locale: string): Promise<IntakeReply> {
  if (!(await currentUser())) return { status: 'invalid' };
  if (!isLocale(locale) || !Array.isArray(turns)) return { status: 'invalid' };
  const clean = turns
    .slice(-10)
    .filter(
      (turn): turn is ChatTurn =>
        (turn?.role === 'user' || turn?.role === 'assistant') && typeof turn.text === 'string',
    )
    .map((turn) => ({ role: turn.role, text: turn.text.slice(0, 1500) }));
  if (clean.at(-1)?.text.length === 0) return { status: 'invalid' };
  return intakeTurn(clean, locale);
}

export type FileState = { status: 'idle' | 'error'; message?: string };

export async function fileComplaint(_previous: FileState, form: FormData): Promise<FileState> {
  const area = String(form.get('area') ?? '');
  const category = form.get('category');
  const title = String(form.get('title') ?? '').trim();
  const summary = String(form.get('summary') ?? '').trim();
  if (!isAreaCode(area)) return { status: 'error', message: 'areaRequired' };
  if (!isCategory(category)) return { status: 'error', message: 'categoryRequired' };
  if (title.length < 5 || title.length > 140) return { status: 'error', message: 'titleInvalid' };
  if (summary.length < 10 || summary.length > 4000) {
    return { status: 'error', message: 'summaryInvalid' };
  }
  const db = await sessionDb();
  const { data, error } = await db.rpc('file_complaint', {
    p_area_code: area,
    p_category: category,
    p_title: title,
    p_summary: summary,
  });
  if (error) {
    const known = ['not_verified', 'too_many', 'unknown_area'].find((code) =>
      error.message.includes(`complaints.${code}`),
    );
    return { status: 'error', message: known ?? 'failed' };
  }
  const id = (data as { id: string }[] | null)?.[0]?.id;
  redirect(`/${localeOf(form)}/account/complaints/${id ?? ''}`);
}

export async function replyToComplaint(_previous: FileState, form: FormData): Promise<FileState> {
  const id = String(form.get('id') ?? '');
  const body = String(form.get('body') ?? '').trim();
  if (!isUuid(id) || body.length < 1 || body.length > 4000) {
    return { status: 'error', message: 'messageInvalid' };
  }
  const db = await sessionDb();
  const { error } = await db.rpc('add_complaint_message', { p_complaint: id, p_body: body });
  if (error) {
    return { status: 'error', message: error.message.includes('closed') ? 'closed' : 'failed' };
  }
  redirect(`/${localeOf(form)}/account/complaints/${id}`);
}
