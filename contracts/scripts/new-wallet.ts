// Creates the anchor service's dedicated publisher wallet (testnet only).
// The private key goes to secrets/publisher_private_key (gitignored, owner-only on Unix) and is
// never printed; only the address is shown, so you can fund it with test ETH.
import { chmodSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { Wallet } from 'ethers';

const secretsDir = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'secrets');
const keyFile = join(secretsDir, 'publisher_private_key');

if (existsSync(keyFile)) {
  const { address } = new Wallet(readFileSync(keyFile, 'utf8').trim());
  console.log(`A publisher wallet already exists: ${address}`);
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
  console.log(`New publisher wallet: ${wallet.address}`);
  console.log(`Private key saved to ${keyFile}. Never commit or share it.`);
  console.log('Fund this address with a little Hoodi test ETH before deploying.');
}
