// Runtime configuration. Values are read on the server at request time, so one build runs in
// every environment; client components receive what they need as props.

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set`);
  return value;
}

export const env = {
  supabaseUrl: () => required('NEXT_PUBLIC_SUPABASE_URL'),
  supabasePublishableKey: () => required('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY'),
  appOrigin: () => process.env.APP_ORIGIN ?? 'http://localhost:3100',
  apiInternalUrl: () => process.env.API_INTERNAL_URL ?? null,
  turnstileSiteKey: () => process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? null,
  chain: () => ({
    chainId: Number(process.env.NEXT_PUBLIC_CHAIN_ID ?? 560048),
    rpcUrl: process.env.NEXT_PUBLIC_RPC_URL ?? null,
    registryAddress: process.env.NEXT_PUBLIC_REGISTRY_ADDRESS ?? null,
    explorerUrl: process.env.NEXT_PUBLIC_EXPLORER_URL ?? 'https://hoodi.etherscan.io',
  }),
};
