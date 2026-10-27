import js from '@eslint/js';
import { defineConfig } from 'eslint/config';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default defineConfig(
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/.next/**',
      '**/coverage/**',
      'services/engine/**',
      'supabase/**',
      'contracts/artifacts/**',
      'contracts/cache/**',
      'contracts/types/**',
      'docs/**',
      'test-vectors/**',
    ],
  },
  js.configs.recommended,
  tseslint.configs.strict,
  {
    languageOptions: {
      globals: { ...globals.node },
    },
    rules: {
      // B17.02: user-controlled HTML must never be injected into the page.
      'no-restricted-syntax': [
        'error',
        {
          selector: "JSXAttribute[name.name='dangerouslySetInnerHTML']",
          message: 'dangerouslySetInnerHTML is banned (threat T06). Render text instead.',
        },
      ],
    },
  },
  {
    // pm2 reads its ecosystem file as CommonJS.
    files: ['**/*.cjs'],
    rules: { '@typescript-eslint/no-require-imports': 'off' },
  },
);
