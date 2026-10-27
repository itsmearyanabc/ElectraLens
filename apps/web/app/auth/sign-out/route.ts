import { NextResponse, type NextRequest } from 'next/server';

import { safeNext } from '@/lib/auth';
import { sessionDb } from '@/lib/supabase/server';

/** S04: POST only, so a link or image elsewhere can't sign anyone out. */
export async function POST(request: NextRequest) {
  const form = await request.formData();
  const next = safeNext(String(form.get('next') ?? ''), '/en');
  const db = await sessionDb();
  await db.auth.signOut({ scope: 'local' });
  return NextResponse.redirect(new URL(next, request.nextUrl.origin), { status: 303 });
}
