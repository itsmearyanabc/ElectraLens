import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    // Test against the schemas source, so no build step is needed first.
    alias: {
      '@electralens/schemas': fileURLToPath(new URL('../schemas/src/index.ts', import.meta.url)),
    },
  },
  test: {
    include: ['test/**/*.test.ts'],
  },
});
