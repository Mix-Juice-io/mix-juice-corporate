import { defineConfig } from 'eslint/config'
import tseslint from 'typescript-eslint'
import astro from 'eslint-plugin-astro'
import jsxA11y from 'eslint-plugin-jsx-a11y-x'
import reactHooks from 'eslint-plugin-react-hooks'
import prettier from 'eslint-config-prettier'
import globals from 'globals'

export default defineConfig(
  { ignores: ['dist/', '.astro/', '.wrangler/', 'node_modules/'] },

  // TypeScript / TSX
  ...tseslint.configs.recommended,

  // Astro components (.astro), including accessibility rules for their markup
  ...astro.configs.recommended,
  ...astro.configs['flat/jsx-a11y-recommended'],

  // React hooks correctness + accessibility for the React islands.
  // eslint-plugin-jsx-a11y-x is the ESLint 10 compatible fork of
  // eslint-plugin-jsx-a11y (whose eslint peer stops at ^9); its rules are
  // namespaced `jsx-a11y-x/`.
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: { globals: { ...globals.browser } },
    plugins: { 'jsx-a11y-x': jsxA11y, 'react-hooks': reactHooks },
    rules: {
      ...jsxA11y.configs.recommended.rules,
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
    },
  },

  // Disable stylistic rules that conflict with Prettier (keep last)
  prettier,
)
