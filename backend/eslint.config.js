import js from '@eslint/js';
import nodePlugin from 'eslint-plugin-n';
import prettier from 'eslint-config-prettier';

export default [
  {
    ignores: ['node_modules/**', 'prisma/dev.db', '**/*.db'],
  },
  js.configs.recommended,
  nodePlugin.configs['flat/recommended'],
  prettier,
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        process: 'readonly',
        console: 'readonly',
        Buffer: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
      },
    },
    rules: {
      eqeqeq: ['error', 'always'],
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      'no-var': 'error',
      'prefer-const': 'warn',
      'n/no-process-exit': 'error',
      'n/no-missing-import': 'off',
      // This backend is an application, not a published npm package.
      // The "no-unpublished-import" rule is designed for libraries.
      'n/no-unpublished-import': 'off',
    },
  },
];
