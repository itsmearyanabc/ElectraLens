// Asks the local anchor service to anchor one approved publication on-chain, signed with the
// shared HMAC key, exactly as the API does after the second approval. For publications approved
// before the registry existed (the demo publication). Run on the VPS:
//   /opt/electralens-node/bin/node --env-file=/etc/electralens/electralens.env \
//     /opt/electralens/infra/scripts/anchor-publication.mjs <publication-id>
import { signRequest } from '../../services/anchor/dist/hmac.js';

const publicationId = process.argv[2];
if (!/^[0-9a-f-]{36}$/i.test(publicationId ?? '')) {
  console.error('usage: anchor-publication.mjs <publication-id>');
  process.exit(2);
}
const key = process.env.ANCHOR_HMAC_KEY;
if (!key) throw new Error('ANCHOR_HMAC_KEY is not set (pass --env-file)');

const body = JSON.stringify({ publication_id: publicationId });
const response = await fetch(
  `${process.env.ANCHOR_URL ?? 'http://127.0.0.1:4200'}/internal/anchor`,
  {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...signRequest(Buffer.from(key, 'utf8'), body) },
    body,
    signal: AbortSignal.timeout(180_000),
  },
);
const result = await response.json();
if (!response.ok) {
  console.error(`anchor refused (${response.status}): ${result.code ?? JSON.stringify(result)}`);
  process.exit(1);
}
console.log(`anchored on-chain: tx ${result.txHash}`);
