// Internal HTTP endpoint (Docker network only, never published to the host).
//   POST /internal/anchor  {"publication_id": "<uuid>"}  signed with HMAC (see hmac.ts)
//   GET  /internal/health
import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import { pathToFileURL } from 'node:url';

import { JsonRpcProvider, Wallet } from 'ethers';

import {
  AnchorRefused,
  anchorPublication,
  reconcile,
  SingleFlight,
  type AnchorDeps,
  type AnchorOutcome,
} from './anchor.ts';
import { EthersChain } from './chain.ts';
import { loadConfig } from './config.ts';
import { NonceCache, verifyRequest } from './hmac.ts';
import { SupabaseStore } from './store.ts';

const MAX_BODY_BYTES = 4096;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

export interface ServerOptions {
  hmacKey: Uint8Array;
  anchor: (publicationId: string) => Promise<AnchorOutcome>;
  health: () => Promise<Record<string, unknown>>;
  nonces?: NonceCache;
}

function send(res: ServerResponse, status: number, body: Record<string, unknown>): void {
  res.writeHead(status, { 'content-type': 'application/json', 'cache-control': 'no-store' });
  res.end(JSON.stringify(body));
}

async function readBody(req: IncomingMessage): Promise<string | null> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    size += (chunk as Buffer).length;
    if (size > MAX_BODY_BYTES) return null;
    chunks.push(chunk as Buffer);
  }
  return Buffer.concat(chunks).toString('utf8');
}

export function buildServer(options: ServerOptions): Server {
  const nonces = options.nonces ?? new NonceCache();
  return createServer((req, res) => {
    void (async () => {
      if (req.method === 'GET' && req.url === '/internal/health') {
        send(res, 200, await options.health());
        return;
      }
      if (req.method !== 'POST' || req.url !== '/internal/anchor') {
        send(res, 404, { code: 'not_found' });
        return;
      }
      if (!(req.headers['content-type'] ?? '').startsWith('application/json')) {
        send(res, 415, { code: 'unsupported_media_type' });
        return;
      }
      const body = await readBody(req);
      if (body === null) {
        send(res, 413, { code: 'too_large' });
        return;
      }
      const verified = verifyRequest(options.hmacKey, req.headers, body, nonces);
      if (!verified.ok) {
        send(res, 401, { code: `auth.${verified.reason}` });
        return;
      }
      let publicationId: unknown;
      try {
        publicationId = (JSON.parse(body) as { publication_id?: unknown }).publication_id;
      } catch {
        publicationId = undefined;
      }
      if (typeof publicationId !== 'string' || !UUID.test(publicationId)) {
        send(res, 400, { code: 'bad_request' });
        return;
      }
      try {
        const outcome = await options.anchor(publicationId);
        send(res, 200, { status: 'published', ...outcome });
      } catch (error) {
        if (error instanceof AnchorRefused) {
          send(res, 409, { code: `anchor.${error.reason}` });
        } else {
          console.error('anchor failed', error);
          send(res, 502, { code: 'anchor.failed' });
        }
      }
    })().catch((error: unknown) => {
      console.error('request failed', error);
      if (!res.headersSent) send(res, 500, { code: 'internal' });
    });
  });
}

async function main(): Promise<void> {
  const config = loadConfig();
  const provider = new JsonRpcProvider(config.rpcUrl, Number(config.chainId), {
    staticNetwork: true,
  });
  const wallet = new Wallet(config.publisherPrivateKey, provider);
  const chain = new EthersChain(wallet, config.registryAddress, {
    network: config.network,
    chainId: config.chainId,
    confirmations: config.confirmations,
    onFeeBump: (fees, attempt) =>
      console.warn(
        `anchor transaction stalled; resending (${attempt}) at ${fees.maxFeePerGas} wei`,
      ),
  });
  const deps: AnchorDeps = {
    store: new SupabaseStore(config.supabaseUrl, config.supabaseSecretKey),
    chain,
    deployBlock: config.deployBlock,
  };
  const queue = new SingleFlight();
  const server = buildServer({
    hmacKey: config.hmacKey,
    anchor: (id) => queue.run(() => anchorPublication(deps, id)),
    health: async () => ({
      ok: true,
      network: config.network,
      chain_id: config.chainId.toString(),
      registry: config.registryAddress,
      publisher: wallet.address,
      balance_wei: (await chain.publisherBalance()).toString(),
    }),
  });

  const runReconcile = () =>
    queue
      .run(() => reconcile(deps, config.minBalanceWei))
      .then((result) => {
        if (result.orphans.length > 0)
          console.error(`CRITICAL: ${result.orphans.length} anchors not in the database`);
        if (result.unexpectedRetractions.length > 0)
          console.error(
            `CRITICAL: ${result.unexpectedRetractions.length} retractions not in the database`,
          );
        if (result.lowBalance) console.warn(`publisher balance low: ${result.balanceWei} wei`);
      })
      .catch((error: unknown) => console.error('reconcile failed', error));
  const timer = setInterval(runReconcile, config.reconcileIntervalMs);
  void runReconcile();

  server.listen(config.port, () =>
    console.log(`anchor service listening on :${config.port} (${config.network})`),
  );
  const stop = () => {
    clearInterval(timer);
    server.close(() => process.exit(0));
  };
  process.on('SIGTERM', stop);
  process.on('SIGINT', stop);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  main().catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  });
}
