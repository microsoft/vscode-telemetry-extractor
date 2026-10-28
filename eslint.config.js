const { defineConfig } = require('eslint/config');
const eslint = require('@eslint/js');
const tseslint = require('typescript-eslint');

module.exports = defineConfig(
  {
    ignores: ['out/**', 'coverage/**', 'src/tests/mocha/resources/**', 'src/tests/mocha/tableResources/**', 'src/telemetry-sources/**'],
  },
  eslint.configs.recommended,
  tseslint.configs.recommended,
  {
    files: ['eslint.config.js'],
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
      'no-undef': 'off',
    },
  },
  {
    rules: {
      '@typescript-eslint/no-namespace': 'off',
    },
  }
);
