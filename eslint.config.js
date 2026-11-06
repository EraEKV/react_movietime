import js from '@eslint/js'
import prettier from 'eslint-config-prettier'
import reactHooks from 'eslint-plugin-react-hooks'
import { reactRefresh } from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'
import globals from 'globals'
import tseslint from 'typescript-eslint'

export default defineConfig([
  globalIgnores(['dist', 'coverage']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite(),
    ],
    languageOptions: {
      ecmaVersion: 'latest',
      globals: globals.browser,
    },
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { varsIgnorePattern: '^[A-Z_]' }],
      '@typescript-eslint/consistent-type-imports': 'error',
    },
  },
  // Layer direction: src/shared knows nothing about the app. Imports are relative, so a file
  // N folders below src must not climb exactly N levels (that lands in src/<other folder>).
  // Climbing further reaches the repository root (public/locales types) and is allowed.
  ...[2, 3].map((depth) => ({
    files: [`src/shared/${'*/'.repeat(depth - 1)}*.{ts,tsx}`],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              regex: `^(\\.\\./){${depth}}(?!\\.\\./)`,
              message: 'shared/ must not import from the rest of src (components, pages, store…).',
            },
          ],
        },
      ],
    },
  })),
  // Must stay last: turns off rules that conflict with Prettier formatting
  prettier,
])
