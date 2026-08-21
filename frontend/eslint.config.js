export default [{
  files: ['src/**/*.{js,jsx}'],
  languageOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    parserOptions: { ecmaFeatures: { jsx: true } },
    globals: {
      console: 'readonly', document: 'readonly', window: 'readonly',
      localStorage: 'readonly', Intl: 'readonly', URL: 'readonly',
    },
  },
  rules: {
    'no-undef': 'error',
    'no-unused-vars': ['warn', { varsIgnorePattern: '^[A-Z_]', argsIgnorePattern: '^[A-Z_]' }],
  },
}]
