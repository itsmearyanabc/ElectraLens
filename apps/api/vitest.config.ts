import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vitest/config';

const here = (path: string) => fileURLToPath(new URL(path, import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      '@electralens/claims': here('../../packages/claims/src/index.ts'),
      '@electralens/anchor/hmac': here('../../services/anchor/src/hmac.ts'),
    },
  },
  test: { include: ['test/**/*.test.ts'] },
});
