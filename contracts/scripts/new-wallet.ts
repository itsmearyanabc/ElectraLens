// Creates a dedicated testnet wallet: `publisher` (the anchor service's hot wallet, the default)
// or `admin` (the registry admin that can revoke and rotate the publisher; keep it offline).
// The private key goes to secrets/<role>_private_key (gitignored, owner-only on Unix) and is
// never printed; only the address is shown.
//   node scripts/new-wallet.ts [publisher|admin]
import { chmodSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { Wallet } from 'ethers';

const role = process.argv[2] ?? 'publisher';
if (role !== 'publisher' && role !== 'admin') {
  throw new Error('role must be publisher or admin');
}
const secretsDir = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'secrets');
const keyFile = join(secretsDir, `${role}_private_key`);

if (existsSync(keyFile)) {
  const { address } = new Wallet(readFileSync(keyFile, 'utf8').trim());
  console.log(`A ${role} wallet already exists: ${address}`);
  console.log(`Key file: ${keyFile} (not overwritten)`);
} else {
  const wallet = Wallet.createRandom();
  mkdirSync(secretsDir, { recursive: true });
  writeFileSync(keyFile, `${wallet.privateKey}\n`, { encoding: 'utf8', mode: 0o600 });
  try {
    chmodSync(keyFile, 0o600);
  } catch {
    // Windows ignores Unix modes; the file is still gitignored.
  }
  console.log(`New ${role} wallet: ${wallet.address}`);
  console.log(`Private key saved to ${keyFile}. Never commit or share it.`);
  if (role === 'publisher') console.log('Fund this address with a little Hoodi test ETH.');
}
