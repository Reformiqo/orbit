import js from '@eslint/js'
import ts from 'typescript-eslint'
import pluginVue from 'eslint-plugin-vue'
import configPrettier from 'eslint-config-prettier'
import vueParser from 'vue-eslint-parser'
import globals from 'globals'

// Mirrors frappe/crm's frontend eslint setup (flat config, Vue 3 + TS-aware).
export default [
  {
    ignores: [
      '**/dist/**',
      '**/node_modules/**',
      '**/public/dist/**',
      '**/playwright-report/**',
      '**/test-results/**',
      'auto-imports.d.ts',
      'components.d.ts',
    ],
  },
  js.configs.recommended,
  ...ts.configs.recommended,
  ...pluginVue.configs['flat/recommended'],
  {
    files: ['**/*.vue', '**/*.js', '**/*.ts'],
    languageOptions: {
      parser: vueParser,
      parserOptions: {
        parser: ts.parser,
        sourceType: 'module',
        ecmaVersion: 'latest',
      },
      globals: {
        ...globals.browser,
        ...globals.node,
        frappe: 'readonly',
        __: 'readonly',
      },
    },
  },
  {
    rules: {
      'vue/multi-word-component-names': 'off',
      'vue/prop-name-casing': 'off',
      'vue/attribute-hyphenation': 'off',
      'vue/v-on-event-hyphenation': 'off',
      'vue/no-v-html': 'off',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      'no-empty': ['error', { allowEmptyCatch: true }],
      // Fires on defensive `let x = false` that is always reassigned before
      // use (common in test setup/teardown) — keep it advisory, not blocking.
      'no-useless-assignment': 'warn',
      'no-undef': 'error',
    },
  },
  configPrettier,
]
