// Writes json/<name>.schema.json for every contract. Run: pnpm --filter @electralens/schemas generate
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { SCHEMA_NAMES, toJsonSchema } from '../src/index.ts';

const outDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'json');
mkdirSync(outDir, { recursive: true });

for (const name of SCHEMA_NAMES) {
  const file = join(outDir, `${name}.schema.json`);
  writeFileSync(file, `${JSON.stringify(toJsonSchema(name), null, 2)}\n`, 'utf8');
  console.log(`wrote ${file}`);
}
