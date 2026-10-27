import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vitest/config';

const src = (path: string) => fileURLToPath(new URL(path, import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      '@electralens/canon': src('../../packages/canon/src/index.ts'),
      '@electralens/schemas': src('../../packages/schemas/src/index.ts'),
    },
  },
  test: {
    include: ['test/**/*.test.ts'],
  },
});
