/* * Copyright (c) 2025 risk
 * Licensed under the MIT License.
 * https://github.com/risk/r-pipeline
 */
module.exports = {
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module',
  },
  overrides: [
    {
      files: ['src/**/*.ts', 'src/**/*.tsx'],
      parserOptions: {
        project: './tsconfig.json',
      },
    },
  ],
  plugins: ['@typescript-eslint', 'prettier', 'header', 'import', 'vitest'],
  extends: ['eslint:recommended', 'prettier'],
  rules: {
    'prettier/prettier': 'error',
    '@typescript-eslint/no-unused-vars': 'error',
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/no-inferrable-types': 'off',
    'header/header': [
      'error',
      'block',
      [
        ' * Copyright (c) 2025 risk',
        ' * Licensed under the MIT License.',
        ' * https://github.com/risk/r-pipeline',
        ' ',
      ],
      { lineEndings: 'unix' },
    ],
    'import/order': [
      'error',
      {
        groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index'],
        'newlines-between': 'always',
        alphabetize: {
          order: 'asc',
          caseInsensitive: true,
        },
      },
    ],
  },
  env: {
    node: true,
    es6: true,
    jest: true,
  },
  globals: {
    vi: 'readonly',
    describe: 'readonly',
    it: 'readonly',
    test: 'readonly',
    expect: 'readonly',
    beforeEach: 'readonly',
    afterEach: 'readonly',
    beforeAll: 'readonly',
    afterAll: 'readonly',
  },
}
