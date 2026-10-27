import { NextResponse, type NextRequest } from 'next/server';

import { safeNext } from '@/lib/auth';
import { sessionDb } from '@/lib/supabase/server';

/** S02: OAuth code exchange, then back to a same-site page. */
export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const next = safeNext(url.searchParams.get('next'), '/en/account');
  const code = url.searchParams.get('code');
  if (code) {
    const db = await sessionDb();
    const { error } = await db.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(next, url.origin));
  }
  return NextResponse.redirect(new URL('/en/account/sign-in?error=failed', url.origin));
}
