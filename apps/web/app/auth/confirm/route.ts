import type { EmailOtpType } from '@supabase/supabase-js';
import { NextResponse, type NextRequest } from 'next/server';

import { safeNext } from '@/lib/auth';
import { env } from '@/lib/env';
import { sessionDb } from '@/lib/supabase/server';

const TYPES: EmailOtpType[] = [
  'magiclink',
  'email',
  'signup',
  'invite',
  'recovery',
  'email_change',
];

/** S03: magic-link and invite confirmation with a token hash. */
export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const tokenHash = url.searchParams.get('token_hash');
  const type = url.searchParams.get('type') as EmailOtpType | null;
  const next = safeNext(url.searchParams.get('next'), '/en/account');
  if (tokenHash && type && TYPES.includes(type)) {
    const db = await sessionDb();
    const { error } = await db.auth.verifyOtp({ token_hash: tokenHash, type });
    if (!error) return NextResponse.redirect(new URL(next, env.appOrigin()));
  }
  return NextResponse.redirect(new URL('/en/account/sign-in?error=expired', env.appOrigin()));
}
