// Configuration. Secrets are read from *_FILE paths (Docker secrets) and fall back to plain
// environment variables only for local development.
import { readFileSync } from 'node:fs';

import { MIN_KEY_BYTES } from './hmac.ts';

export interface AnchorConfig {
  port: number;
  hmacKey: Buffer;
  publisherPrivateKey: string;
  rpcUrl: string;
  network: string;
  chainId: bigint;
  registryAddress: string;
  deployBlock: number;
  confirmations: number;
  supabaseUrl: string;
  supabaseSecretKey: string;
  reconcileIntervalMs: number;
  minBalanceWei: bigint;
}

type Env = Readonly<Record<string, string | undefined>>;

function secret(env: Env, name: string): string {
  const file = env[`${name}_FILE`];
  const value = file ? readFileSync(file, 'utf8').trim() : env[name];
  if (!value) throw new Error(`missing ${name} (set ${name}_FILE or ${name})`);
  return value;
}

function required(env: Env, name: string): string {
  const value = env[name];
  if (!value) throw new Error(`missing ${name}`);
  return value;
}

export function loadConfig(env: Env = process.env): AnchorConfig {
  const hmacKey = Buffer.from(secret(env, 'ANCHOR_HMAC_KEY'), 'utf8');
  if (hmacKey.length < MIN_KEY_BYTES)
    throw new Error(`ANCHOR_HMAC_KEY must be at least ${MIN_KEY_BYTES} bytes`);
  const registryAddress = required(env, 'REGISTRY_ADDRESS');
  if (!/^0x[0-9a-fA-F]{40}$/.test(registryAddress))
    throw new Error('REGISTRY_ADDRESS is not an address');
  return {
    port: Number(env.ANCHOR_PORT ?? 4200),
    hmacKey,
    publisherPrivateKey: secret(env, 'PUBLISHER_PRIVATE_KEY'),
    rpcUrl: required(env, 'RPC_URL'),
    network: env.CHAIN_NETWORK ?? 'hoodi',
    chainId: BigInt(required(env, 'CHAIN_ID')),
    registryAddress,
    deployBlock: Number(required(env, 'REGISTRY_DEPLOY_BLOCK')),
    confirmations: Number(env.CONFIRMATIONS ?? 1),
    supabaseUrl: required(env, 'SUPABASE_URL'),
    supabaseSecretKey: secret(env, 'SUPABASE_SECRET_KEY'),
    reconcileIntervalMs: Number(env.RECONCILE_INTERVAL_MS ?? 600_000),
    minBalanceWei: BigInt(env.MIN_BALANCE_WEI ?? '10000000000000000'), // 0.01 test ETH
  };
}
