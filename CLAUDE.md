# CLAUDE.md

Operating manual for an agent working in the LightVerse repo. **Read this first, every
session.** It links to everything else. Keep it short — a stale entry point is worse than none.
When reporting information to me, be extremely concise and sacrifice grammar for sake of concision.

## What LightVerse is (one line)

An SMS-native scripture-memorization service: it texts users a verse each morning with words
progressively blanked out, they reply to recall it, and spaced repetition resurfaces older verses
before they fade.

**Canonical product context is `docs/product/v1-brief.md`.** Read it before any product-shaped
change, and do not re-decide anything settled there (SMS-first, UK-only for now, crude review
ladder over SM-2, trial-to-paid, manual billing). If a task appears to contradict the brief, stop
and ask.

## Stack

- **Web:** Next.js 15 (App Router), React 19, TypeScript, Tailwind, shadcn/ui, TanStack Query. On Vercel.
- **Backend:** Supabase — Postgres (RLS on every table), phone-OTP auth, and **Deno** edge functions in `supabase/functions/`.
- **SMS:** Twilio. **Every edge-function code path can send a paid SMS — treat outbound messages as spending real money.**
- **Node:** 20 (`.nvmrc` → 20.19.5). Use it; don't assume the machine default.

## Commands

All five run in CI on every PR, in this order (cheapest first, so a PR fails fast):

- `npm run lint` → `eslint .` (flat config, ESLint 9). Currently reports 13 warnings and 0 errors;
  `react/no-unescaped-entities` is deliberately downgraded to a warning — see `eslint.config.mjs`.
- `npm run typecheck` → `tsc --noEmit`
- `npm test` → `vitest run`, the shared-core suite (`npm run test:watch` while working)
- `npm run check:edge` → `deno check` over `supabase/functions`, the only thing that typechecks the
  edge functions at all — the root `tsconfig.json` excludes them
- `npm run check:version` → fails unless this branch bumps `package.json`'s version and records it
  in the README (see `docs/workflow/versioning.md`)
- `npm run build` → production build (what Vercel gates on)

Plus `npm run dev` for a local dev server.

**Requires Node 20.19.5 (`nvm use`) and Deno** — `check:edge` cannot run without Deno installed.

## Repo map

- `src/app` — pages, API routes, server actions
- `src/components` — UI
- `src/lib` — client-side utilities
- `supabase/functions/daily-send-sms` — the 08:00 cron sender (Deno)
- `supabase/functions/receive-sms-webhook` — Twilio inbound handler (Deno)
- `supabase/functions/_shared` — code shared across functions; **new shared business logic goes in
  `_shared/core/`** (pure, runtime-agnostic, tested once)
- `supabase/migrations` — sequential SQL, applied by hand
- `docs/` — product brief, architecture, runbook, decisions, agent config (`docs/agents/`)

## The rules that matter

1. **Never commit to `main`.** One branch per issue: `<type>/<issue-number>-<slug>`.
2. **Migrations are forward-only and additive.** Never `DROP TABLE`, `DROP COLUMN`, `TRUNCATE`, or a
   lossy type change. Migration 009 once dropped the streaks table and destroyed every user's
   history — this rule exists because it has already gone wrong here. If a change seems to need a
   destructive step, stop and ask.
3. **Edge functions are Deno, not Node.** URL imports, `Deno.env`, no `node_modules`, no Node
   built-ins. See `supabase/functions/CLAUDE.md`.
4. **The inbound webhook is unauthenticated by design** — Twilio sends no JWT, so it deploys
   `--no-verify-jwt`. That is *exactly* why it must verify the Twilio request signature before
   touching the database. Never remove either half of that pairing.
5. **No secrets in the diff, ever.** Keys and project refs live in `.env` (local) and
   Supabase/Vercel secrets (deployed) — never in a committed file. To document a secret, use a
   placeholder like `<SERVICE_ROLE_KEY>`.
6. **Keep your context in version control.** Do not rely on, cite, or act on untracked local files.
   If useful knowledge exists only in an untracked file, flag it to be committed (scrubbed of
   secrets) rather than silently depending on it — anything not in the repo is invisible to review,
   to CI, and to the next session.
7. **Verify, don't assume.** Ground every claim about the codebase in a file you have actually
   opened. Never reference a file, column, table, or command without confirming it exists. A
   confident wrong premise is more dangerous than an admitted unknown — it survives right up until
   it breaks something.
8. **Shared business logic → `_shared/core/`, with a test.** Don't duplicate logic across the web
   and edge runtimes; extract it, import it in both, and test it once.

## How to raise an MR

1. Confirm a **GitHub issue** exists for the work (`gh issue view <n>`). If not, open one from
   the ticket template and get it approved first. Issues are the only ticket surface — see
   [`docs/agents/issue-tracker.md`](docs/agents/issue-tracker.md).
2. `git checkout main && git pull`, then branch `<type>/<issue-number>-<slug>`.
3. Implement. Tests alongside the code, not after. A bug fix gets a test that fails without the fix.
   **Bump `package.json`'s version and add a README "Version history" line** — `feat` → minor,
   everything else → patch, and the user-visible test wins over the commit type. When torn, choose
   the smaller bump. See [`docs/workflow/versioning.md`](docs/workflow/versioning.md).
4. Run the full gate locally: `npm run check:version && npm run lint && npm run typecheck &&
   npm test && npm run build` (plus `npm run check:edge` if you touched a function).
5. Conventional commits: `type(scope): subject` — types `feat|fix|chore|docs|refactor|test|ci`,
   scopes `web|edge|db|core|ci|docs`.
6. `git push -u origin <branch>`, open a PR with the template, put `Closes #<issue>` in the body,
   and tick only the checklist items that are genuinely true.
7. **Stop. Report the PR URL.** Never merge, self-approve, or force-push a reviewed branch. Never
   apply a migration or deploy a function — those are human-run.

## Never do this

- Commit to `main`, or merge your own PR.
- Write a destructive migration, or edit an already-applied one.
- Put a real key, token, or project ref in a tracked file.
- Deploy an edge function, apply a migration, or change the cron schedule — all human-gated.
- Claim a file, column, or behaviour exists without opening it first.

## Agent skills

Per-repo config the engineering skills read. Edit these files directly; they are the source of truth.

### Issue tracker

GitHub Issues on `moloke/lightverse`, via the `gh` CLI — the **single** ticket surface, replacing
the retired `docs/tickets/` directory. The required issue body shape lives in
[`.github/ISSUE_TEMPLATE/ticket.md`](.github/ISSUE_TEMPLATE/ticket.md). See
[`docs/agents/issue-tracker.md`](docs/agents/issue-tracker.md).

### Triage labels

The five canonical roles, label strings unchanged: `needs-triage`, `needs-info`,
`ready-for-agent`, `ready-for-human`, `wontfix`. See
[`docs/agents/triage-labels.md`](docs/agents/triage-labels.md).

### Domain docs

Single-context: one `CONTEXT.md` plus `docs/adr/` at the repo root. Neither exists yet — skills
proceed silently without them. See [`docs/agents/domain.md`](docs/agents/domain.md).
