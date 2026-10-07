// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  { ignores: ['dist/*', 'android/*', 'ios/*', '.android-env/*', 'builds/*'] },
  // Dados financeiros nunca devem ir para logs.
  { rules: { 'no-console': 'error' } },
  // Scripts de build/validação rodam no computador e só imprimem status (sem dados financeiros).
  { files: ['scripts/**'], rules: { 'no-console': 'off' } },
]);
