// Process entry point. server.ts only starts itself when run directly as `node dist/server.js`;
// under pm2 the script is loaded by pm2's own wrapper, so pm2 runs this file instead.
import { main } from './server.ts';

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
