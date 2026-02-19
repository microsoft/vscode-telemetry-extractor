const eslint = require('@eslint/js');
const tseslint = require('typescript-eslint');


module.exports = tseslint.config(
  {
    ignores: ['src/tests/mocha/resources/**'],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
);