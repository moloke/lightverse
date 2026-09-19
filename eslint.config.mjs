import { dirname } from 'path'
import { fileURLToPath } from 'url'
import { FlatCompat } from '@eslint/eslintrc'

const __dirname = dirname(fileURLToPath(import.meta.url))

// eslint-config-next is still eslintrc-shaped, so FlatCompat translates it for ESLint 9's flat
// config. When it ships a native flat config, this indirection can go.
const compat = new FlatCompat({ baseDirectory: __dirname })

const config = [
  {
    ignores: [
      '.next/**',
      'node_modules/**',
      'next-env.d.ts',
      // Deno, not Node — URL imports and Deno globals that Node-shaped rules misread.
      // `npm run check:edge` is what covers these. See supabase/functions/CLAUDE.md.
      'supabase/functions/**',
    ],
  },

  ...compat.extends('next/core-web-vitals'),

  {
    rules: {
      // Downgraded from error to warning, deliberately and temporarily.
      //
      // This rule fires 10 times across 6 components — all of them cosmetic JSX text escaping
      // (a literal ' or " that should be &apos; / &quot;). Fixing them means touching application
      // code, which issue #10 explicitly puts out of scope: a config change bundled with edits
      // across six files makes both halves unreviewable.
      //
      // They stay visible as warnings rather than being switched off. Promote back to "error"
      // once the cleanup issue lands.
      'react/no-unescaped-entities': 'warn',
    },
  },
]

export default config
