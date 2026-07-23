import { base } from '../../eslint.config.base.mjs'
import nextPlugin from '@next/eslint-plugin-next'
import globals from 'globals'
import jsxA11y from 'eslint-plugin-jsx-a11y'

export default [
  ...base,
  {
    files: ['**/*.{ts,tsx,js,jsx}'],
    languageOptions: {
      globals: { ...globals.browser },
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    plugins: { '@next/next': nextPlugin, 'jsx-a11y': jsxA11y },
    rules: {
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs['core-web-vitals'].rules,
      ...jsxA11y.configs.recommended.rules,
    },
  },
]
