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

await app.listen({ host: '0.0.0.0', port: config.port });
