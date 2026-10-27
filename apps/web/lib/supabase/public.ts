import 'server-only';

import { createClient } from '@supabase/supabase-js';
import { cache } from 'react';

import type { Database } from '../database.types';
import { env } from '../env';

/** Public pages may show data up to this old; it bounds the load on the free-tier database. */
export const PUBLIC_REVALIDATE_SECONDS = 60;

/**
 * Anonymous reads for public pages. RLS and column grants decide what is visible, exactly as for
 * any visitor. Responses are kept in the Next.js data cache, so the HTML can be rendered per
 * request (it carries a CSP nonce) without querying the database every time.
 */
export const publicDb = cache(() =>
  createClient<Database>(env.supabaseUrl(), env.supabasePublishableKey(), {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: {
      fetch: (input, init) =>
        fetch(input, { ...init, next: { revalidate: PUBLIC_REVALIDATE_SECONDS } }),
    },
  }),
);
