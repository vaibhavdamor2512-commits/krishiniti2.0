export default [{
  files: ['src/**/*.{js,jsx}'],
  languageOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    parserOptions: { ecmaFeatures: { jsx: true } },
    globals: {
      console: 'readonly', document: 'readonly', window: 'readonly',
      localStorage: 'readonly', Intl: 'readonly', URL: 'readonly',
      Response: 'readonly', File: 'readonly', FormData: 'readonly', fetch: 'readonly',
      crypto: 'readonly', TextEncoder: 'readonly', btoa: 'readonly', atob: 'readonly',
      Event: 'readonly', Image: 'readonly',
    },
  },
  rules: {
    'no-undef': 'error',
    'no-unused-vars': ['warn', { varsIgnorePattern: '^[A-Z_]', argsIgnorePattern: '^[A-Z_]' }],
  },
}]
