const eslint = require('@eslint/js');
const tseslint = require('typescript-eslint');
const pluginSecurity = require('eslint-plugin-security');


module.exports = tseslint.config(
  eslint.configs.recommended,
  pluginSecurity.configs.recommended,
  ...tseslint.configs.recommended,
);