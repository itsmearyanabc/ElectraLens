import { createServerClient } from '@supabase/ssr';
import type { NextRequest, NextResponse } from 'next/server';

import type { Database } from '../database.types';
import { env } from '../env';

/**
 * Refreshes the auth session before account and console pages render, writing any new cookies
 * onto the response the proxy already built. Responses that set cookies must not be cached.
 */
export async function refreshSession(request: NextRequest, response: NextResponse) {
  const supabase = createServerClient<Database>(env.supabaseUrl(), env.supabasePublishableKey(), {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookiesToSet, headers) => {
        for (const { name, value, options } of cookiesToSet) {
          request.cookies.set(name, value);
          response.cookies.set(name, value, options);
        }
        for (const [key, value] of Object.entries(headers)) response.headers.set(key, value);
      },
    },
  });
  await supabase.auth.getClaims();
}
