// API configuration. Secrets come from *_FILE paths (Docker secrets) and never from the image.
import { readFileSync } from 'node:fs';

type Env = Record<string, string | undefined>;

function secret(env: Env, name: string, required = true): string | null {
  const path = env[`${name}_FILE`];
  const value = path ? readFileSync(path, 'utf8').trim() : (env[name] ?? '').trim();
  if (!value && required) throw new Error(`${name} or ${name}_FILE must be set`);
  return value || null;
}

export interface Config {
  port: number;
  appOrigin: string;
  supabaseUrl: string;
  publishableKey: string;
  secretKey: string;
  turnstileSecret: string | null;
  /** Only for local development: skips Turnstile when no secret is configured. */
  turnstileDisabled: boolean;
  anchorUrl: string | null;
  anchorHmacKey: Buffer | null;
  ipHashSalt: string;
}

export function loadConfig(env: Env = process.env): Config {
  const hmac = secret(env, 'ANCHOR_HMAC_KEY', false);
  return {
    port: Number(env.PORT ?? 4100),
    appOrigin: (env.APP_ORIGIN ?? 'http://localhost:3100').replace(/\/$/, ''),
    supabaseUrl:
      (env.SUPABASE_URL ?? '').replace(/\/$/, '') || (secret(env, 'SUPABASE_URL') as string),
    publishableKey: secret(env, 'SUPABASE_PUBLISHABLE_KEY') as string,
    secretKey: secret(env, 'SUPABASE_SECRET_KEY') as string,
    turnstileSecret: secret(env, 'TURNSTILE_SECRET_KEY', false),
    turnstileDisabled: env.TURNSTILE_DISABLED === '1' && env.NODE_ENV !== 'production',
    anchorUrl: env.ANCHOR_URL ?? null,
    // Same encoding as the anchor service: the key file's text, as UTF-8 bytes.
    anchorHmacKey: hmac ? Buffer.from(hmac, 'utf8') : null,
    ipHashSalt: secret(env, 'IP_HASH_SALT', false) ?? 'electralens-local-only',
  };
}
