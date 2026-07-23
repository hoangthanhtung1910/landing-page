// Shared ESLint 9 flat config base for the VyVy Order Korea monorepo.
// Per-app eslint.config.mjs files import and extend this.
import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import globals from 'globals'

export const ignores = {
  ignores: [
    '**/node_modules/**',
    '**/dist/**',
    '**/.next/**',
    '**/next-env.d.ts',
    '**/*.tsbuildinfo',
  ],
}

/** Base config shared by every workspace package. */
export const base = [
  ignores,
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: { ...globals.node },
    },
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },
]
