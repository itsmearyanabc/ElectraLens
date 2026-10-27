import { buildApp } from './app.ts';
import { loadConfig } from './config.ts';
import { createDeps } from './deps.ts';

const config = loadConfig();
const app = await buildApp(createDeps(config));

const shutdown = () => {
  void app.close().then(() => process.exit(0));
};
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

// Localhost only by default: nginx is the one public entry point on the VPS.
await app.listen({ host: process.env.HOST ?? '127.0.0.1', port: config.port });
