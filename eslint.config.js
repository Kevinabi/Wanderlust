import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist', 'coverage', 'playwright-report', 'test-results']),

  // Browser / React source
  {
    files: ['src/**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    rules: {
      // Resetting child state when the active category changes is intentional
      // here; treat this perf advisory as a warning, not a build-blocking error.
      'react-hooks/set-state-in-effect': 'warn',
    },
  },

  // Node files: serverless functions, dev server, tests, config
  {
    files: ['api/**/*.js', 'server.js', 'tests/**/*.js', 'e2e/**/*.js', '*.config.js'],
    extends: [js.configs.recommended],
    languageOptions: {
      globals: { ...globals.node },
      sourceType: 'module',
    },
  },
])
