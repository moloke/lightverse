import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    // The shared core is the only thing under test today: pure, runtime-agnostic functions that
    // both the Next app and the Deno edge functions import. See docs/engineering/testing.md.
    //
    // src/ is deliberately not included yet — component and integration tests were excluded from
    // the readiness scaffolding (readiness plan §3.8) as disproportionate at this cadence. Widen
    // this glob when that changes.
    include: [
      'supabase/functions/_shared/core/**/*.test.ts',
      // Repo tooling. Widened deliberately for the version gate, whose comparison logic is where
      // the bugs would be ('0.1.10' > '0.1.9' is false as a string).
      'scripts/**/*.test.mjs',
    ],
    environment: 'node',
  },
})
