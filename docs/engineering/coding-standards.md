# Coding standards

Short by design. The rules that matter are in the root `CLAUDE.md`; this file only adds
conventions you can't infer from it. When the two disagree, `CLAUDE.md` wins.

**The real standard: match the file you're in.** This codebase has two runtimes with different
idioms, and consistency within a file beats consistency across the repo.

## Conventions

- **TypeScript strict is on** (`tsconfig.json`). Don't weaken it.
- **Imports:** `@/*` → `./src/*` in the Next app. Edge functions use URL imports and relative paths
  with explicit `.ts` extensions — see `supabase/functions/CLAUDE.md`.
- **Formatting:** `src/` uses 4-space indent; `supabase/functions/` uses 2-space and omits
  semicolons. There is no formatter configured, so follow the file you're editing rather than
  reformatting it. Never reformat a file you're otherwise not changing — it buries the real diff.
- **Naming:** components `PascalCase.tsx`, utilities `kebab-case.ts`, migrations
  `NNN_verb_noun.sql`.

## Two habits this codebase learned the hard way

**Don't swallow errors.** Empty catch blocks and unused error bindings are how the live streak bug
survived: `verse-actions.ts:166-186` binds `updateError` and `insertError`, never reads them, and
leaves a comment where the handling should be. The write has been failing silently ever since.
Handle it, or log it, or let it throw — but don't bind it and walk away.

**Don't reach for `any` at boundaries.** `session: any` (`PracticeInterface.tsx:15`),
`clozeData: any` (`ClozeDisplay.tsx:18`), `updates: any` (`verse-actions.ts:105`). Each one is a
place where a column rename fails at runtime instead of at compile time — which is exactly the bug
above. `supabase gen types typescript` would have caught it.

## Shared logic

Business logic needed by both runtimes goes in `supabase/functions/_shared/core/` as pure
functions, imported by both sides and tested once. Don't copy it — this repo already has the
cloze algorithm three times and SMS sending twice, and the copies have drifted. See
[`testing.md`](testing.md).

## Commits and branches

Conventional Commits, `type(scope): subject`, per `CLAUDE.md`:

- **Types:** `feat`, `fix`, `chore`, `docs`, `refactor`, `test`, `ci`
- **Scopes:** `web`, `edge`, `db`, `core`, `ci`, `docs`
- **Branches:** `<type>/<ticket-id>-<slug>` — e.g. `fix/003-twilio-signature-verification`

Example: `fix(edge): verify Twilio request signature before processing`
