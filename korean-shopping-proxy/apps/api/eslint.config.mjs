import { base } from '../../eslint.config.base.mjs'

export default [
  ...base,
  {
    // NestJS relies on decorator metadata; keep interfaces/DI ergonomic.
    rules: {
      '@typescript-eslint/no-extraneous-class': 'off',
    },
  },
]
