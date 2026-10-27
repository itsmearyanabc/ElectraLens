import 'server-only';

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

import type { Database } from '../database.types';
import { env } from '../env';

/**
 * The signed-in user's client for account and console pages. Every query and workflow call runs
 * with the user's own token, so RLS and the database functions see who is asking.
 */
export async function sessionDb() {
  const store = await cookies();
  return createServerClient<Database>(env.supabaseUrl(), env.supabasePublishableKey(), {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (cookiesToSet) => {
        try {
          for (const { name, value, options } of cookiesToSet) store.set(name, value, options);
        } catch {
          // Server Components can't set cookies; the proxy refreshes the session instead.
        }
      },
    },
  });
}
