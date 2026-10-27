import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vitest/config';

const here = (path: string) => fileURLToPath(new URL(path, import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      '@electralens/canon': here('../../packages/canon/src/index.ts'),
      '@electralens/schemas': here('../../packages/schemas/src/index.ts'),
      '@electralens/i18n': here('../../packages/i18n/src/index.ts'),
    },
  },
  test: { include: ['test/**/*.test.ts'] },
});
