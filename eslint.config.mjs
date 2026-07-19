import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import reactHooks from 'eslint-plugin-react-hooks'
import globals from 'globals'

// Pragmatic baseline: the whole existing codebase must pass with zero errors.
// Tighten rules gradually as files get refactored, not all at once.
export default tseslint.config(
  {
    ignores: ['node_modules/**', 'out/**', 'dist/**', 'build/**', '.acceptance-tmp/**', '*.tsbuildinfo'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx,mjs,cjs}'],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    rules: {
      // The IPC surface and PDF data plumbing use `any` in places; clean up
      // per-file during refactors instead of blocking lint on it.
      '@typescript-eslint/no-explicit-any': 'off',
      // Existing catch blocks rewrap errors without `cause` throughout; revisit later.
      'preserve-caught-error': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
      ],
    },
  },
  {
    files: ['**/*.cjs'],
    languageOptions: {
      sourceType: 'commonjs',
    },
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    plugins: { 'react-hooks': reactHooks },
    rules: {
      ...reactHooks.configs.recommended.rules,
      // ~20 modals/forms still sync state from props inside effects (reset-on-open
      // patterns). Restructuring each is riskier than the payoff; revisit per-file.
      'react-hooks/set-state-in-effect': 'off',
    },
  },
  {
    // Electron main process and test helpers load native/CJS modules
    // (better-sqlite3) with `import x = require()`.
    files: ['electron/**', 'tests/**'],
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
      '@typescript-eslint/triple-slash-reference': 'off',
    },
  },
)
