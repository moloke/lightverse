# Testing

## Where we are

**There are no automated tests.** No runner, no test files, no `test` script. Verification today is
manual: trigger the function, look at your phone. `npx tsc --noEmit` passes clean, so typecheck can
be made mandatory with no cleanup backlog — but it covers only `src/`, because the root
`tsconfig.json` excludes `supabase/functions`.

Wiring the runner and the scripts is [issue #10](https://github.com/moloke/lightverse/issues/10).

## Strategy: one shared core, tested once

The cloze algorithm exists three times and SMS sending twice (see
[`../architecture.md`](../architecture.md) §7). Testing three copies of the same logic is the wrong
answer. Extract it once instead:

```
supabase/functions/_shared/core/
  cloze.ts        ← the single cloze implementation (SMS string + structured web output)
  validation.ts   ← normalise, word-align, per-word fuzzy match, missed-word list
  dates.ts        ← dayKey(date, timeZone) — the one date idiom
  scheduling.ts   ← the v1 review ladder: given a session and a date, what's due?
  messages.ts     ← SMS copy builders (emoji-free, segment-aware)
```

**Pure functions only** — no `Deno.*`, no `fetch`, no Supabase client, no `process.env`. Deno
imports these natively; Next imports them via a `tsconfig` path alias; Vitest tests them once and
both runtimes are covered.

This directory does not exist yet. The first ticket that needs a piece of it creates that piece —
don't build the whole tree up front.

> **Spike this before committing to the layout (~15 min).** Deno requires explicit `.ts` extensions
> in relative imports; TypeScript accepts those only with `allowImportingTsExtensions`. Confirm
> Next actually builds a page that imports from the shared core.
> **Fallback:** keep the core in `src/lib/core/` and copy it into `_shared/core/` at deploy time,
> with CI checking for drift. **Second fallback:** accept the duplication and run two suites.
> Both fallbacks cost tooling, not coverage — the tests below are the same either way.

## First targets, in order

Chosen because they're pure, they're where the confirmed defects are, and they're what v1 builds
on.

1. **`cloze.ts`** — step 1 returns the verse verbatim; hidden-word count matches the ladder; word
   count is preserved; blanks are separate tokens (locks out the dead implementation's
   up-to-25-underscores bug); deterministic given a seed.
2. **`validation.ts`** — a verse missing a whole phrase must **fail** (today's character-level 85%
   threshold passes it); a verse with typos in three words must **pass**; case and punctuation are
   ignored; the returned missed-word list is exact. These tests are the spec for word-level
   feedback.
3. **`dates.ts`** — `dayKey` is stable across a UTC-midnight boundary, and a 23:30 BST timestamp
   yields the expected UK day. **Pin `TZ` in CI** so these can't pass by accident.
4. **`scheduling.ts`** — the 1/3/7/30/90 ladder: given a session and a date, is it due? Does a new
   verse or a due review take priority? **Write these before the engine exists** — they are v1's
   specification, and the highest-value tests here.
5. **`messages.ts`** — copy contains no emoji (emoji force 70-char UCS-2 segments and roughly double
   the cost per message); a typical verse fits the expected segment count. Cheap, and it protects
   margin directly.

**A bug fix gets a test that fails without the fix.** That is the whole standard — if you can't
write the failing test, you haven't found the bug yet.

## Deliberately not doing

Component tests, E2E/Playwright, and mocking the Supabase client to integration-test the edge
handlers. All legitimate, all disproportionate for a solo weekend cadence — and none of them are
where the actual defects live. The one likely exception is Twilio signature verification, which
deserves its own test wherever it lands.

## Running it

```bash
npm run lint         # next lint       — BLOCKED: no ESLint config exists yet (ticket 000)
npm run typecheck    # tsc --noEmit    — passes clean today
npm test             # vitest run      — CI mode
npm run test:watch   # vitest          — while developing
npm run check:edge   # deno check supabase/functions/**/*.ts
```

**Only `lint` exists in `package.json` today, and it's the broken one** — with ESLint 9 and no
`eslint.config.*`, `next lint` drops into interactive setup and cannot run headless. The other four
scripts are added by ticket 000. Until then CI is red, which is expected and fine.

Deno is not installed on this machine by default, so `check:edge` needs a local install; CI gets it
from `denoland/setup-deno`.
