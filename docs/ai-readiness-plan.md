# LightVerse — AI-Readiness Plan

**Status:** Draft for review. Phases 0-2 are largely done; Phase 1 is [issue #10](https://github.com/moloke/lightverse/issues/10).
**Date:** 2026-09-09
**Scope:** Discovery (Phase 1) and a scaffolding plan (Phase 2) to make this repo safe for an
AI agent to pick up a ticket and return tested, secure, reviewed code via an MR.

> **Partly superseded.** §3.6 chose in-repo tickets in `docs/tickets/`; that directory is retired
> and **GitHub Issues is now the single ticket surface** — see the `Tickets move to GitHub Issues`
> entry in [`decisions.md`](decisions.md). Every `docs/tickets/...` path below is historical.
> The P0 backlog in §2.5 is now issues [#10](https://github.com/moloke/lightverse/issues/10)-[#15](https://github.com/moloke/lightverse/issues/15); M-2 is closed.

**Canonical product context is [`docs/product/v1-brief.md`](product/v1-brief.md).** This document
does not re-decide anything in the brief. Where the brief defers something (per-user timezones,
real SM-2, billing automation), this plan treats that as settled and only asks that the code
stop *pretending* the decision doesn't exist.

---

## Part 1 — Architecture Summary

### 1.1 Topology

Four systems, three of which are configured outside the repo:

```
                        ┌──────────────────────────────────────┐
                        │  Vercel — Next.js 15 App Router      │
   Browser ─────────────│  src/app  (pages, API routes,        │
   (authed via          │            server actions)           │
    Supabase cookie)    │  middleware.ts → auth gate           │
                        └──────────────┬───────────────────────┘
                                       │ anon key + RLS
                                       ▼
   ┌───────────────────────────────────────────────────────────────────┐
   │  Supabase (project ref `<PROJECT_REF>`)                    │
   │                                                                   │
   │   Postgres ── 6 tables, RLS on all ── auth.users (phone OTP)      │
   │      ▲                                                            │
   │      │ service_role (bypasses RLS)                                │
   │      │                                                            │
   │   Edge Functions (Deno)                                           │
   │      • daily-send-sms        ← pg_cron, 0 8 * * * (UTC)           │
   │      • receive-sms-webhook   ← Twilio, deployed --no-verify-jwt   │
   └───────────────────────┬───────────────────────────────────────────┘
                           │ REST, HTTP Basic (account SID : auth token)
                           ▼
                    ┌─────────────┐
                    │   Twilio    │ ──── SMS ────▶ user's phone
                    └─────────────┘ ◀─── reply ───
```

**What lives outside version control** (and is therefore invisible to an agent — see gap M-4):
the pg_cron schedule, the Twilio webhook URL binding, all Supabase secrets, all Vercel env vars,
and the fact that migrations are applied by hand in the SQL editor.

### 1.2 The daily loop, traced end to end

| # | Step | Code | Notes |
|---|------|------|-------|
| 1 | pg_cron fires `0 8 * * *` UTC | *dashboard only, not in repo* | Posts to the function with the **service role key** in the header |
| 2 | Fetch work | [daily-send-sms/index.ts:55-76](../supabase/functions/daily-send-sms/index.ts#L55-L76) | All `verse_sessions` where `completed_at IS NULL` and `users.account_disabled = false`. Inner-joins `users` and `bible_verses`. No pagination, no batching. |
| 3 | Skip paused | [:111-117](../supabase/functions/daily-send-sms/index.ts#L111-L117) | `paused_until > now()` |
| 4 | Skip already-sent-today | [:120-131](../supabase/functions/daily-send-sms/index.ts#L120-L131) | Compares `last_message_at` to *runtime-local* Y/M/D. Correct only because the Deno runtime is UTC. See C-3. |
| 5 | Build cloze | [:7-42](../supabase/functions/daily-send-sms/index.ts#L7-L42) | Hides a **random** `[0, .15, .30, .45, .60, .75, .90][step-1]` fraction of words, replacing each with `_____`. Unseeded — re-sending the same step hides different words. |
| 6 | Compose + send | [:144-155](../supabase/functions/daily-send-sms/index.ts#L144-L155) | Emoji in copy (📖, 💪). `sendSMS` prepends `LIGHTVERSE: `. |
| 7 | Log + mark sent | [:166-182](../supabase/functions/daily-send-sms/index.ts#L166-L182) | Inserts `sms_logs`, sets `last_message_at` + `awaiting_reply = true`. **After** the send, un-transactionally. |
| 8 | User replies | Twilio → webhook | `POST` form-encoded to `receive-sms-webhook`, **unauthenticated** (`--no-verify-jwt`) and **unverified** (no signature check). See S-1. |
| 9 | Identify sender | [receive-sms-webhook/index.ts:176-200](../supabase/functions/receive-sms-webhook/index.ts#L176-L200) | Exact string match on `users.phone_number = From`. Unknown → logs and **sends an SMS to that number**. |
| 10 | Find session | [:203-235](../supabase/functions/receive-sms-webhook/index.ts#L203-L235) | `.single()` on the one active session. `awaiting_reply` is **never read**. See C-5. |
| 11 | Validate | [:65-68](../supabase/functions/receive-sms-webhook/index.ts#L65-L68) | Whole-string Levenshtein ≥ 0.85 on normalised **characters**, against the *full* verse at every step. |
| 12 | Advance | [:71-155](../supabase/functions/receive-sms-webhook/index.ts#L71-L155) | `current_step + 1`; at >7 sets `completed_at`. XP +10 (+100 on completion). Streak: read-modify-write on `streaks`, UTC day key. |
| 13 | Reply to user | [:263-299](../supabase/functions/receive-sms-webhook/index.ts#L263-L299) | Success/encouragement SMS. Incorrect → first 5 words as a hint. Returns empty TwiML. |

**A parallel, divergent loop exists on the web.** `/practice/[sessionId]` renders
[ClozeDisplay.tsx](../src/components/practice/ClozeDisplay.tsx), which builds its own cloze via
`createClozeTest`, grades **per word by exact match**, then calls the
[`updateProgress`](../src/app/actions/verse-actions.ts#L92) server action — a *second, independent*
implementation of step advancement, XP and streaks. It disagrees with the SMS path (see C-2)
and its streak write is silently broken (see C-1).

### 1.3 Data model

Six tables. All have RLS enabled.

| Table | Key columns | RLS policies | Assessment |
|---|---|---|---|
| `users` | `id` → `auth.users`, `phone_number` UNIQUE, `name`, `paused_until`, `account_disabled`, `total_xp` | SELECT / UPDATE / INSERT, all `auth.uid() = id` | Sound. Note UPDATE has no `WITH CHECK`, so a user could in principle rewrite their own `phone_number` or `total_xp`. Low impact today. |
| `bible_verses` | `reference`, `text`, `translation` | SELECT `TO authenticated USING (true)`; writes service-role only | Sound. |
| `verse_sessions` | `user_id`, `verse_id`, `current_step` (CHECK 1–7), `total_steps`, `last_message_at`, `completed_at`, `awaiting_reply` | Full CRUD, all `auth.uid() = user_id` | Sound. Partial unique index enforces one active session per user. **No review/spacing columns** — this is where v1's headline feature lands. |
| `sms_logs` | `direction`, `phone_number`, `message`, `status`, `twilio_sid` | RLS on, **zero policies** → deny-all to users | Correct and deliberate. Retains full message bodies indefinitely (minor privacy note). |
| `streaks` | `user_id` UNIQUE, `current_streak`, `last_activity_date` | SELECT / INSERT / UPDATE, all `auth.uid() = user_id` | Shape is fine. Reached via a destructive migration (see C-6); the web writer still targets the *old* shape. |
| `support_tickets` | → **`auth.users(id)`**, `ticket_type`, `status`, `priority` | SELECT / INSERT / UPDATE, all `auth.uid() = user_id` | Inconsistent: only table FK'd to `auth.users` rather than `public.users`, and the only one using `uuid_generate_v4()` (needs `uuid-ossp`) instead of `gen_random_uuid()`. See C-7. |

**Migration hygiene:** nine files, sequentially numbered, applied by hand. `009` is a
`DROP TABLE ... CASCADE` rebuild. There is no `supabase/config.toml`, so there is **no way to
test a migration locally** before running it against production.

### 1.4 Current state: tests, CI/CD, observability

**Automated tests — confirmed, there are none.** No test runner, no test files, no `test` script,
no `/coverage` output despite `.gitignore` anticipating it. `task.md` lists eight testing tasks,
all unchecked. Verification is entirely manual, via the curl-and-check-your-phone procedure in
`DEPLOYMENT_GUIDE.md`.

**CI/CD — confirmed, there is none.** No `.github/` directory at all. No `vercel.json`. Vercel's
default git integration builds `main` and previews PRs, so `next build` is the only thing that
gates anything — and it does not run lint or tests, and it **excludes the edge functions entirely**
(`tsconfig.json` `exclude: ["supabase/functions"]`).

Two things block a CI pipeline today and must be fixed first:

- **There is no ESLint config file anywhere.** `eslint@9` and `eslint-config-next` are installed,
  but with no `eslint.config.*` or `.eslintrc.*`, `next lint` drops into interactive setup. `npm run lint`
  cannot run headless. This is ticket zero.
- **Nothing typechecks the Deno code.** `npx tsc --noEmit` currently **passes cleanly** (good news —
  CI can gate typecheck from day one with no cleanup backlog), but only because
  `supabase/functions` is excluded. The two functions that *are* the product have no static checking
  of any kind.

**Observability — thin but not absent.** `console.log`/`console.error` into Supabase function logs
(short retention on the free tier); a genuinely useful `sms_logs` audit table; Twilio's own
messaging log. The gaps are alerting and error handling:

- **Nothing alerts on failure.** If the cron stops firing or Twilio credentials lapse, every user
  silently stops receiving verses and you find out from a support ticket. For a product whose entire
  value proposition is "it reliably texts you," this is the highest-consequence operational gap.
- `daily-send-sms` accumulates a per-session error array and returns 200 regardless — a run where
  every send failed looks identical to success from the caller's perspective.
- Errors are swallowed in several places with empty or comment-only catch blocks
  ([PracticeInterface.tsx:41-43](../src/components/practice/PracticeInterface.tsx#L41-L43)) and
  unused error bindings ([verse-actions.ts:166-186](../src/app/actions/verse-actions.ts#L166-L186)).
- No error-reporting service (Sentry or equivalent) on either side.

---

## Part 2 — Prioritised Gaps and Risks

Priority is **impact × likelihood**, judged for a live product with ~9 users and one weekend
developer. P0 = fix before building v1 features. P1 = fix during v1. P2 = tracked, not urgent.

### 2.1 Verdicts on your five suspicions

| Your suspicion | Verdict | What I actually found |
|---|---|---|
| Twilio webhook doesn't verify the request signature | **Confirmed — and worse** | No signature check anywhere. Deployed `--no-verify-jwt`, so it is fully unauthenticated. The sharp edge isn't fake progress: it's an **open SMS relay** (S-1). |
| Two divergent cloze implementations | **Confirmed, mechanism different** | There are **three** implementations across two files. The two *live* ones agree algorithmically (both random-hiding, same percentages); the **prefix-truncation one is dead code** — but its docstring is the file header, so the file documents behaviour the product does not have (C-2). |
| Timezone/date handling inconsistent, blocks non-UK users | **Confirmed, with a nuance** | The system is UTC-consistent *by accident of hosting*, not by design. Two different date idioms are used, one of which reads as runtime-local. It is correct today and would break silently the moment anything runs off-UTC (C-3). |
| Whole-string 85% Levenshtein is blunt, no word-level feedback | **Confirmed** | Worse than "blunt": it's 85% of *characters*, so a ~150-char verse tolerates ~22 characters of error — an entire missing phrase can pass. And step 1 grades against a verse it just showed you in full (C-4). |
| At least one migration is destructive | **Confirmed** | `009_fix_streaks_table_schema.sql` does `DROP TABLE IF EXISTS public.streaks CASCADE` (C-6). Every streak in the database was destroyed when it ran. |

### 2.2 Security

**S-1 · P0 · The inbound webhook is an unauthenticated open SMS relay.**
`receive-sms-webhook` performs no Twilio signature validation and is deployed with
`--no-verify-jwt`. The URL is a stable, guessable `https://<ref>.supabase.co/functions/v1/...`,
and the project ref is committed in `DEPLOYMENT_GUIDE.md`. Anyone who can `POST` a form body can:
- **Send an SMS to any phone number on earth, at your expense.** `POST` with `From=<any number>`;
  the number isn't in `users`, so the function replies *to that number* with
  "Sorry, we couldn't find your account…" ([:193-197](../supabase/functions/receive-sms-webhook/index.ts#L193-L197)).
  Unrate-limited. This is toll fraud and a harassment vector, and it's the finding I'd fix first.
- Forge progress, XP and streaks for any user whose phone number they know.
- Cause an outbound SMS per request for real users too — every inbound triggers a reply.

*Fix:* verify `X-Twilio-Signature` (HMAC-SHA1 over the full URL + sorted POST params, keyed on the
auth token) before touching the database, and drop unknown senders **silently** rather than
replying. *Alternative:* a shared-secret query parameter on the webhook URL — simpler, but weaker
and non-standard; signature validation is well-documented and roughly the same effort.

**S-2 · P1 · `daily-send-sms` can be triggered by anyone holding the anon key.**
It is deployed with JWT verification on, but the anon key *is* a valid JWT and is public by
design (it ships to every browser). A live one is committed in
`supabase/functions/DEPLOYMENT_GUIDE.md` alongside the project ref. Impact is bounded by the
already-sent-today guard — an attacker can force each user's daily message to arrive early, but
not spam them repeatedly. Still: a stranger should not be able to trigger your send loop.
*Fix:* require a dedicated shared secret header, or check the caller's role claim is
`service_role`. *Alternative:* leave it and rely on the idempotency guard — I'd not, because C-8
shows that guard is racy.

**S-3 · P1 · Secrets and identifiers committed to the repo.**
`DEPLOYMENT_GUIDE.md` contains a live anon JWT and the production project ref. The anon key is
public by design so this is not a breach, but it is the thing that makes S-1 and S-2 trivially
exploitable rather than merely theoretical. The same guide instructs storing the **service role
key** inline in a pg_cron SQL command, which persists it in `cron.job` in plaintext.
`.env` is correctly untracked and `.gitignore`d — that part is fine.
*Fix:* purge live values from docs; use placeholders. Vault the cron's key.

**S-4 · P2 · XP is client-trusted on the web path.**
`updateProgress(sessionId, currentStep)` takes the step from the client and awards XP with no
server-side check of the answer. A user can inflate their own XP arbitrarily. Self-inflicted and
cosmetic today, so P2 — but it's an unvalidated write path that will matter if XP ever gates
anything.

**S-5 · P2 · `Access-Control-Allow-Origin: *` on both edge functions.** Meaningless for the
Twilio webhook, mildly counterproductive for the sender. Tighten or drop.

**S-6 · P2 · No rate limiting on `send-otp`.** Supabase Auth applies its own limits, so this is
partially mitigated, but the route is an unauthenticated SMS-costing endpoint. Worth a look once
S-1 is closed.

### 2.3 Correctness

**C-1 · P0 · Web practice never updates the streak — silently.**
[verse-actions.ts:170](../src/app/actions/verse-actions.ts#L170) writes `date: ...` to `streaks`,
but migration 009 dropped the `date` column and replaced it with `last_activity_date`. The write
fails; the error is bound to an unused variable and discarded. Line 151 reads
`(streakData.date || streakData.last_activity_date)`, defensive code for a schema that no longer
exists. **Net effect: practising on the web builds no streak. Only SMS replies do.** Streaks are a
core retention mechanic, so this is a live product defect, not just tech debt.

**C-2 · P0 · Cloze logic is triplicated and the documentation describes the dead copy.**
- `supabase/functions/daily-send-sms/index.ts:7` — `generateClozeText`, random hiding. **Live (SMS).**
- `src/lib/utils/cloze-deletion.ts:115` — `createClozeTest`, random hiding, same percentages. **Live (web).**
- `src/lib/utils/cloze-deletion.ts:44` — `generateClozeText`, prefix truncation, percentages
  interpreted as *visible* rather than hidden. **Dead** — imported nowhere. It also has a real bug
  (`"_____".repeat(min(hidden,5))` emits one run of up to 25 underscores, not N separate blanks).

The two live copies are verbatim duplicates with no shared source and nothing to stop them drifting.
The dangerous part for an agent: the file's header docstring ("Step 2: ~85% visible … Step 7: ~10%
visible, only first few words as hint") documents the **dead** implementation. An agent reading
this file will confidently describe behaviour the product does not have.
`getExpectedText`, `generateHint`, and all of `text-utils.ts`'s `validateResponse`/`getFirstWords`
are likewise dead; `countWords` is imported but unused. The brief already schedules consolidation
for v1 — this raises it from "nearly free while you're in there" to load-bearing.

**C-3 · P0 (as a hazard) · Two date idioms, one of which lies.**
- `daily-send-sms:120-131` compares `getFullYear/getMonth/getDate` — **runtime-local time**.
- `receive-sms-webhook:115` and `verse-actions.ts:142` use `toISOString().split('T')[0]` — **UTC**.

Both are UTC in production only because Supabase Edge and Vercel both run UTC. The local-time
comparison is a trap: it reads as correct, and will silently produce wrong "already sent today"
answers in local dev or any non-UTC runtime. Separately, the streak day boundary is midnight UTC,
so a UK user in summer rolls over at 1am BST.
*Fix, right-sized:* the brief **defers** per-user timezones, so do not build them. Extract one
`dayKey(date, timeZone = 'Europe/London')` helper into the shared core, use it everywhere, and
give it a test. That makes the UK-only decision explicit and one-parameter reversible in v2,
which is exactly what the brief's "profile that *has* a phone number" reasoning asks for.

**C-4 · P1 · Character-level Levenshtein is the wrong instrument.**
85% similarity over normalised characters means a 150-character verse tolerates ~22 characters of
edit distance — enough to drop a whole four-word phrase and still be told "Correct!". It also
gives no word-level feedback, which the brief lists as v1-if-quick / v1.1. Two further notes:
step 1 sends the full verse and grades against the full verse, making it a copy-paste test; and
`normalizeText`'s `[^\w\s]` strips accents and non-ASCII, so non-English translations would
degrade badly. The web path meanwhile *already* does per-word exact matching — so the two channels
grade differently, and the web's word-level scoring is the better starting point for the v1.1
feature.
*Fix:* one word-aligned comparison in the shared core: tokenise, align, per-word fuzzy match
(small edit distance per word so typos aren't scored as forgetting), return the list of missed
words. Serves SMS feedback and web grading from one tested function.
*Alternative:* keep whole-string but score on **word** distance rather than characters — cheaper,
still no per-word feedback. I'd go straight to word-aligned since it's the same work.

**C-5 · P1 · `awaiting_reply` is written but never read — the ladder can be skipped.**
Both functions maintain the flag; neither checks it. Nothing stops a user replying seven times in
one afternoon and "memorising" a verse in a day. That defeats the spacing the whole product is
built on, and it will interact badly with the v1 review engine. Gate advancement on
`awaiting_reply` (or on a once-per-day-key rule reusing C-3's helper).

**C-6 · P0 (as a process gap) · A destructive migration shipped and destroyed data.**
`009_fix_streaks_table_schema.sql` opens with `DROP TABLE IF EXISTS public.streaks CASCADE`.
Every user's streak history was deleted when it ran. The code change it was "fixing" (C-1) was
never completed, so the data was destroyed *and* the bug survived. The defect isn't the SQL — it's
that nothing in the process flagged it. This is the strongest argument in this document for the
runbook and the local-migration workflow in Part 3.

**C-7 · P1 · `support_tickets` migration is inconsistent and may not apply cleanly.**
Uses `uuid_generate_v4()` (requires the `uuid-ossp` extension) where every other table uses
`gen_random_uuid()`; FKs to `auth.users(id)` where every other table FKs to `public.users(id)`.
On a fresh database without `uuid-ossp` enabled, migration 007 fails — which nobody would discover,
because migrations are never run from scratch.

**C-8 · P1 · The daily send is not idempotent under concurrency.**
`last_message_at` is written *after* the Twilio call and outside any transaction. Two overlapping
invocations (a cron retry, or a manual trigger during the cron run — trivially arrangeable given
S-2) both read yesterday's timestamp and both send. Users get duplicate messages and you pay twice.
*Fix:* claim the row first with a conditional update (`WHERE last_message_at < today`) and send
only if the claim succeeded.

**C-9 · P2 · Emoji force 70-character SMS segments.** 📖 💪 ✅ 🎉 🙏 appear throughout both
functions' copy, pushing messages from GSM-7 (160 chars/segment) to UCS-2 (70). The
`LIGHTVERSE: ` prefix in `sendSMS` adds 12 more to every segment. The brief already flags this as
a roughly-halves-cost, free win. Confirmed present. Worth a locked-down test so it can't regress.

**C-10 · P2 · No data model for the review engine.** `verse_sessions` has no `next_review_at`,
interval index, or review-vs-learning distinction. Noting it because it's the main schema change
v1 needs, and it should go in as a purely additive migration under the new process.

### 2.4 Maintainability

**M-1 · P0 · No tests, no CI, and lint cannot run.** Covered in §1.4. The ESLint config gap is
the immediate blocker: `npm run lint` is non-functional headless, so it must be fixed before any
pipeline can gate on it.

**M-2 · P0 · Documentation actively misleads.** Six root-level markdown files plus `plans/` plus
three function READMEs, several of them stale or contradictory:
- `task.md` shows the entire "Supabase Edge Functions" section unchecked — the functions are built
  and in production.
- `README.md` says "Node 20+ (current version: 18.20.4 — consider upgrading)" while `.nvmrc` pins
  20.19.5, and lists 5 migrations when 9 exist.
- `DEPLOYMENT_GUIDE.md` instructs creating `006_setup_daily_sms_cron.sql`; `006` is already the
  profile-fields migration.
- `cloze-deletion.ts`'s header documents dead code (C-2).

For a human, stale docs are an annoyance. For an agent, they are **false premises it will act on**.
This is the single highest-value thing to fix for agent-readiness, and it costs a deletion.

**M-3 · P1 · Business logic is duplicated across two runtimes with no shared module.** Cloze,
normalisation, Levenshtein and streak logic all exist twice or three times across `src/` and
`supabase/functions/`. Nothing structurally prevents further drift. Part 3 proposes a single
runtime-agnostic core as the fix — which also makes one test suite cover both sides.

**M-4 · P1 · Critical infrastructure is not in version control.** The pg_cron schedule *is* the
product's heartbeat and exists only in the Supabase dashboard. Same for the Twilio webhook binding
and all secrets. An agent cannot see, reason about, or safely change any of it.

**M-5 · P1 · No local database.** No `supabase/config.toml`, so no `supabase start` / `db reset`.
Migrations go straight from an editor to production, untested. Given C-6 already happened, this is
a recurrence waiting to happen.

**M-6 · P2 · Weak typing at the boundaries.** `session: any` in `PracticeInterface`,
`clozeData: any`, `updates: any`, `options?: any` in both Supabase cookie adapters. No generated
database types, so column renames like the one in C-1 fail silently at runtime instead of loudly
at compile time. `supabase gen types typescript` would have caught C-1.

**M-7 · P2 · Silent error handling.** Empty catch blocks and unused error bindings, as catalogued
in §1.4. C-1 is *precisely* the failure mode this produces.

### 2.5 The one-screen summary

| ID | P | Area | Gap |
|---|---|---|---|
| S-1 | **P0** | Sec | Webhook unauthenticated → open SMS relay, forged progress |
| C-1 | **P0** | Corr | Web practice silently never updates streaks (dead column) |
| C-2 | **P0** | Corr | Cloze triplicated; docstring documents the dead copy |
| C-3 | **P0** | Corr | Two date idioms; one reads local-time and lies |
| C-6 | **P0** | Corr | Destructive migration shipped, destroyed all streak data |
| M-1 | **P0** | Maint | No tests, no CI; ESLint has no config so lint can't run |
| M-2 | **P0** | Maint | Stale docs an agent will act on as fact |
| S-2 | P1 | Sec | Anyone with the (public) anon key can trigger the send loop |
| S-3 | P1 | Sec | Live anon key + project ref committed; service key in cron SQL |
| C-4 | P1 | Corr | Char-level 85% Levenshtein; no word-level feedback |
| C-5 | P1 | Corr | `awaiting_reply` never read → ladder skippable in one day |
| C-7 | P1 | Corr | `support_tickets` migration inconsistent, may not apply clean |
| C-8 | P1 | Corr | Daily send not idempotent → duplicate sends, double cost |
| M-3 | P1 | Maint | Logic duplicated across runtimes, no shared module |
| M-4 | P1 | Maint | Cron/webhook/secrets not in version control |
| M-5 | P1 | Maint | No local DB; migrations untested before production |
| S-4/5/6, C-9/10, M-6/7 | P2 | — | Client-trusted XP, CORS, OTP rate limit, emoji cost, review schema, `any` types, silent catches |

---

## Part 3 — AI-Readiness Plan

### 3.0 The principle I'm optimising for

An agent fails in this repo for three reasons, in this order: it **can't find the truth** (M-2,
stale docs), it **can't verify its work** (M-1, no tests), and it **can't tell what's dangerous**
(C-6, no runbook). Everything below targets those three, in that order. Anything that doesn't is
excluded — I've listed the notable exclusions in §3.8 so you can disagree with them explicitly.

Total proposed footprint: **13 new files, ~11 deletions.** Net file count goes up by two.

### 3.1 Documentation tree

```
CLAUDE.md                          ← agent entry point (root)
README.md                          ← rewritten, short, human-facing
docs/
  product/v1-brief.md              ← EXISTS, unchanged. Canonical product truth.
  architecture.md                  ← how the system works
  runbook.md                       ← how to change production safely
  decisions.md                     ← why things are the way they are
  ai-readiness-plan.md             ← this file (delete once executed)
  tickets/
    TEMPLATE.md
    000-example.md
supabase/functions/CLAUDE.md       ← nested, Deno-runtime rules
.github/
  pull_request_template.md
  workflows/ci.yml
```

**Each file, and why it earns its place:**

| Path | One-line content | Why it exists |
|---|---|---|
| `CLAUDE.md` | Stack, commands (`dev`/`lint`/`typecheck`/`test`), repo map, the five rules that matter, links to the four docs, "never do this" list. | The agent's front door. Everything else is reachable from here, so it must be short and never stale. |
| `supabase/functions/CLAUDE.md` | Deno ≠ Node: URL imports, `Deno.env`, no `node_modules`, excluded from root `tsconfig`, `deno check` before deploy, webhook must stay `--no-verify-jwt` *and* signature-verified, cost-awareness (every code path here can send a paid SMS). | Agents reliably write Node idioms in Deno files. This is the highest-value nested file in the repo — and the only place the "this code spends money" rule can live where it'll be read. |
| `docs/architecture.md` | §1.1–§1.3 of this document, maintained: topology diagram, the 13-step loop table, the data model + RLS table. | Stops every agent re-deriving the loop from scratch. Replaces `walkthrough.md` + the three function READMEs. |
| `docs/runbook.md` | Migration procedure, edge deploy procedure, cron/webhook config, rollback, the destructive-change rule, where secrets live, what to check when SMS stops. | The C-6 insurance policy, and the home for the M-4 infrastructure that currently exists only in a dashboard. Replaces `DEPLOYMENT_GUIDE.md` (minus its committed anon key). |
| `docs/decisions.md` | Append-only list: date, decision, why, alternative rejected. Seeded with the brief's deferrals (UK-only/8am UTC, crude ladder over SM-2, manual billing, SMS-first). | Prevents the most expensive agent failure mode: helpfully "fixing" a deliberate decision. One file, three lines per entry — not a per-ADR directory. |
| `docs/tickets/TEMPLATE.md` + `000-example.md` | The unit of work an agent picks up (§3.6). | Tickets in-repo means the agent has the spec, the code and the tests in one context. |
| `README.md` (rewrite) | What LightVerse is, how to run it locally, links to `docs/`. ~40 lines. | Humans and GitHub's landing page. Its current 400 lines duplicate everything else and are wrong in three places. |

**Deleting** (all superseded; harvest anything useful into the files above first):
`EMAIL_NOTIFICATION_SETUP.md`, `SUPPORT_TICKET_SETUP.md`, `implementation_plan.md`,
`initial_prompt.md`, `task.md`, `walkthrough.md`, `plans/` (3 files),
`supabase/functions/DEPLOYMENT_GUIDE.md`, and both function `README.md`s.

Nothing in those is load-bearing that isn't reproduced in `architecture.md` or `runbook.md`.
`plans/sms_automation_implementation.md` is the only one with real design rationale — mine it for
`decisions.md`, then delete. They are all recoverable from git history if needed.

*Alternative considered:* keep the setup guides as `docs/setup/*.md`. Rejected — they document
one-time configuration already done, and their staleness is a liability that outweighs their
archaeological value.

### 3.2 Testing foundation

**Recommendation: one shared core, one test runner.**

The duplication in M-3 is the root cause of C-2, C-3 and C-4. Rather than testing three copies of
the cloze algorithm, extract the pure logic once and test it once:

```
supabase/functions/_shared/core/
  cloze.ts        ← the single cloze implementation (SMS string + structured web output)
  validation.ts   ← normalise, word-align, per-word fuzzy match, missed-word list
  dates.ts        ← dayKey(date, tz) — the one date idiom (C-3)
  scheduling.ts   ← the v1 review ladder: given a session + today, what's due?
  messages.ts     ← SMS copy builders (emoji-free, segment-aware)
```

Pure functions only: no `Deno.*`, no `fetch`, no Supabase client, no `process.env`. Deno imports
these natively; Next imports them via a `tsconfig` path alias; **Vitest tests them once and both
runtimes are covered.**

- **Runner: Vitest.** Fast, near-zero config, native TS/ESM, good watch mode.
  *Alternative:* Jest — slower and awkward with ESM+TS. `node:test` — no watch/coverage ergonomics.
  Vitest is the clear pick.
- **`deno test`:** you suggested it, and it's the right instinct — but under this structure it
  would test the same pure functions a second time. My recommendation is to **not** add a second
  suite now, and instead run **`deno check`** in CI so the edge functions are typechecked (which
  today nothing does). Add `deno test` later, if and when logic appears that genuinely can't live
  in the shared core — signature verification is the likely first candidate, and it's worth its own
  test wherever it lands.
  *Note:* Deno is **not installed on this machine**. CI gets it via `denoland/setup-deno`; add the
  local install step to the runbook.

> **One assumption to spike (~15 min, do it in ticket 002 before committing to the layout):**
> Deno requires explicit `.ts` extensions in relative imports; TypeScript accepts those only with
> `allowImportingTsExtensions: true`. Confirm Next builds a page that imports from the shared core.
> **Fallback if it doesn't:** keep the core under `src/lib/core/` for Next, and have the build step
> copy it into `supabase/functions/_shared/core/` before deploy — one script, checked by CI for
> drift. **Second fallback:** accept the duplication and run two suites (Vitest + `deno test`), as
> you originally proposed. Note the fallbacks cost tooling, not test coverage — the tests below are
> written against the same functions either way.

**Highest-value first targets, in order.** These are chosen because they're pure, they're where the
confirmed bugs are, and they're the logic v1 is about to build on:

1. **`cloze.ts`** — step 1 returns the verse verbatim; hidden-word count matches the percentage
   ladder; word count is preserved; blanks are separate tokens (locks out the C-2 bug); determinism
   given a seed.
2. **`validation.ts`** — the C-4 regression cases: a verse missing a whole phrase must **fail**;
   a verse with typos in three words must **pass**; punctuation and case are ignored; the returned
   missed-word list is exact. These tests are the spec for the v1.1 word-level feedback feature.
3. **`dates.ts`** — `dayKey` is stable across a UTC-midnight boundary; a 23:30 BST timestamp yields
   the expected UK day. Pin `TZ` in CI so this can't pass by accident.
4. **`scheduling.ts`** — the review ladder (1/3/7/30/90): given a session and a date, is it due?
   New verse vs. review takes priority correctly. **Write these tests as v1's spec, before the
   engine exists.** This is the single most valuable test file in the plan.
5. **`messages.ts`** — copy contains no emoji (locks C-9); a typical verse fits the expected
   segment count. Cheap, and directly protects margin.

Explicitly **not** recommended for v1: component tests, E2E/Playwright, mocking the Supabase client
to integration-test the edge handlers. All real, all disproportionate for a weekend cadence. The
pure core is where the bugs actually are.

**How to run:**
```bash
npm test              # vitest run          — CI mode
npm run test:watch    # vitest              — while developing
npm run typecheck     # tsc --noEmit        — currently passes clean
npm run lint          # next lint           — BLOCKED until eslint config exists
npm run check:edge    # deno check supabase/functions/**/*.ts
```

### 3.3 CI pipeline

**`.github/workflows/ci.yml`** — one workflow, one job, on `pull_request` and `push: [main]`:

```
checkout → setup-node (from .nvmrc) + npm cache → npm ci
  → npm run lint
  → npm run typecheck
  → npm test
  → setup-deno → npm run check:edge
  → npm run build
```

Set `TZ: UTC` at the job level so the C-3 date tests are deterministic. Concurrency group per ref
so pushes cancel stale runs. Then turn on branch protection for `main` requiring this check.

*Reasoning:* four gates, all currently green or near-green — typecheck passes clean today, so
there's no cleanup backlog before CI can be made mandatory. Ordering is cheapest-first for fast
failure; `build` last because Vercel will run it anyway but a PR should fail before preview deploy.

*Two blockers to clear first:* (a) M-1, no ESLint config — with ESLint 9, `eslint-config-next`
needs flat config via `FlatCompat` from `@eslint/eslintrc`; budget an hour for this, it's fiddlier
than it sounds. (b) Node version drift: README says 18.20.4, `.nvmrc` says 20.19.5, this machine
runs v22.17.1. Pick one, put it in `.nvmrc`, have CI read it from there.

*Alternative:* pre-commit hooks (husky + lint-staged) for fast local feedback. Worth adding later
as a complement, not a substitute — hooks are bypassable with `--no-verify` and don't run on the
agent's pushes. *Alternative:* separate workflows per concern. Rejected — one file is easier to
keep honest at this scale.

*Deliberately excluded:* deploy automation. Vercel already auto-deploys; edge functions and
migrations stay manual and human-gated (§3.5). Automating a deploy path that can drop tables and
spend money is the wrong thing to hand an agent this early.

### 3.4 The SDLC loop

**Branches.** `<type>/<ticket-id>-<slug>` — e.g. `fix/003-twilio-signature-verification`. Types
match the commit types below. The repo currently uses `feature/` and `fix/`; aligning `feature/`→
`feat/` keeps branch and commit vocabulary identical, which is one less thing to get wrong.
*Alternative:* keep `feature/`. Cosmetic either way — just pick one and put it in `CLAUDE.md`.

**Commits.** Conventional Commits: `type(scope): subject`.
Types: `feat`, `fix`, `chore`, `docs`, `refactor`, `test`, `ci`.
Scopes: `web`, `edge`, `db`, `core`, `ci`, `docs`.
Example: `fix(edge): verify Twilio request signature before processing`.
*Reasoning:* it's a shared vocabulary the agent already knows, and it makes the log skimmable
months later. Not proposing commitlint — the PR template checklist is enough at this scale.

**`.github/pull_request_template.md`** — what changed, why, ticket link, how it was tested,
risk/rollback note, then the definition-of-done checklist inline.

**Definition of done** (lives in the PR template so it's ticked where it's reviewed, not in a
separate doc nobody opens):

- [ ] Linked to a ticket in `docs/tickets/`
- [ ] `lint`, `typecheck`, `test`, `check:edge`, `build` all pass locally
- [ ] New/changed **pure logic has a test**; bug fixes have a test that fails without the fix
- [ ] No new secrets, keys or project refs in the diff
- [ ] Any DB migration is **additive**, or destructive-and-explicitly-approved (§3.5)
- [ ] Any change to SMS-sending code paths notes the **cost impact**
- [ ] Docs updated if behaviour changed (`architecture.md` / `runbook.md` / `decisions.md`)
- [ ] Deliberate decisions recorded in `decisions.md`

**How the agent raises an MR — the exact procedure, to go in `CLAUDE.md`:**

1. Confirm a ticket exists in `docs/tickets/`. If not, write one and get it approved first.
2. `git checkout main && git pull` → branch as above. **Never commit to `main`.**
3. Implement. Tests alongside the code, not after.
4. Run the full gate locally: `npm run lint && npm run typecheck && npm test && npm run build`.
5. Conventional commits, ending with the `Co-Authored-By:` attribution line.
6. `git push -u origin <branch>` → `gh pr create` using the template; fill every checklist item
   honestly, ticking only what's actually true. PR body ends with the Claude Code attribution line.
7. **Stop.** Report the PR URL. Never merge, never self-approve, never force-push to a reviewed
   branch, never touch production directly.
8. If something in scope turned out to be blocked, say so in the PR body rather than quietly
   dropping it.

### 3.5 Migrations and deploys

**The rule, stated once and prominently in `runbook.md` and `CLAUDE.md`:**

> Migrations are **forward-only and additive**. An agent must never write `DROP TABLE`,
> `DROP COLUMN`, `TRUNCATE`, or a type change that loses data. If a schema change appears to need
> one, the agent stops and asks. C-6 destroyed every user's streak history — that's not
> hypothetical, it already happened here.

**Migration procedure:**
1. Add `supabase/config.toml` so `supabase start` / `supabase db reset` work locally (fixes M-5).
2. New file only — **never edit an applied migration**. Keep the `NNN_verb_noun.sql` convention.
3. Verify against a fresh local DB: `supabase db reset` replays all migrations from zero, which is
   also the only thing that will ever catch C-7.
4. Regenerate types: `supabase gen types typescript --local > src/lib/database.types.ts`. This is
   what turns C-1-class column drift into a compile error (M-6).
5. Apply to production **manually, by you**, after the PR merges. Never by the agent.
6. Additive-then-migrate for renames: add the new column, backfill, switch the code, drop later in
   a separate human-run change.

**Edge function deploys** (manual, human-run):
```bash
deno check supabase/functions/**/*.ts        # nothing does this today
supabase functions deploy daily-send-sms
supabase functions deploy receive-sms-webhook --no-verify-jwt   # REQUIRED — Twilio sends no JWT
```
Document in `runbook.md`: `--no-verify-jwt` is mandatory *and* is exactly why S-1's signature check
is the only thing standing between that URL and your Twilio balance. The two facts belong on the
same line, permanently.

**Bring infrastructure into the repo** (fixes M-4): the pg_cron schedule as a checked-in migration
(reading its key from Vault, not inline), and the Twilio webhook URL documented in `runbook.md`.

### 3.6 Ticket format

> **Superseded.** The *location* decided here was reversed: tickets are GitHub issues, and the
> issue number is the ticket id that names the branch (`<type>/<issue-number>-<slug>`). The
> *format* below survives unchanged as [`.github/ISSUE_TEMPLATE/ticket.md`](../.github/ISSUE_TEMPLATE/ticket.md).
> Config: [`agents/issue-tracker.md`](agents/issue-tracker.md).

`docs/tickets/NNN-short-slug.md`, numbered sequentially, matching the branch name.

```markdown
# NNN — <title>

**Type:** feat | fix | chore | refactor    **Priority:** P0 | P1 | P2
**Gap ref:** S-1 / C-4 / M-3 (from docs/ai-readiness-plan.md, where applicable)

## Context
Why this matters, in 2–4 sentences. Link the relevant part of docs/product/v1-brief.md.

## Scope
**In:** the specific change.
**Out:** what to explicitly not touch (this is the field that stops scope creep).

## Acceptance criteria
- [ ] Observable, checkable statements — not implementation steps.

## Testing
Which tests must exist and pass. For a bug fix: the test that fails before the fix.

## Risk & rollback
Touches SMS sending? Costs money? Migration? How to undo it.

## Notes
Files likely involved, gotchas, prior decisions in docs/decisions.md.
```

*Reasoning:* "Out" and "Risk & rollback" are the two fields that do real work with an agent — the
first bounds it, the second forces it to notice when it's near something expensive or irreversible.
*Alternative:* GitHub Issues. Better for tracking, worse for agents — an in-repo ticket is in the
same context window as the code and the tests, at zero API cost. You could mirror to Issues later.

### 3.7 Sequencing

| Phase | Effort | What | Why in this order |
|---|---|---|---|
| **0. Truth** | ~2h | Delete the 11 stale docs. Write `CLAUDE.md`, `supabase/functions/CLAUDE.md`, `docs/architecture.md` (lift §1 of this doc), `docs/decisions.md`. Purge the committed anon key. | Costs almost nothing and immediately stops the agent acting on false premises (M-2). Highest value per minute in this plan. |
| **1. Verification** | ~4h | ESLint flat config (unblocks lint). Vitest + scripts. `.github/workflows/ci.yml` + `pull_request_template.md`. Branch protection on `main`. | Nothing else can be trusted until the agent can prove its work. Do the spike in §3.2 here. |
| **2. Safety** | ~2h | `docs/runbook.md`, `supabase/config.toml`, generated DB types, `docs/tickets/TEMPLATE.md`. | Makes migrations and deploys safe *before* v1 starts changing schema for the review engine. |
| **3. Proving run** | ~3h | Agent's first real ticket: **`fix/003-twilio-signature-verification`** (S-1). | Small, self-contained, genuinely urgent, and it exercises the whole loop — ticket → branch → test → CI → PR. If the scaffolding is wrong, this is where you find out, cheaply. |
| **4. Then v1** | — | The brief's scope: review engine, cloze consolidation (C-2), emoji strip (C-9), word-level feedback (C-4). Each as a ticket. | Phases 0–3 are ~11h, one weekend. Everything after is the product. |

Phases 0–2 write no application code, which means they can't break production. Suggested order
for the P0/P1 backlog after the proving run: **C-1** (live streak bug, one-line class of fix),
**S-2/S-3** (key hygiene, quick), **C-2 + C-3** (fold into the shared-core extraction, which v1's
cloze consolidation needs anyway), **C-5/C-8** (fold into the review-engine work), then C-4, C-7.

### 3.8 Deliberately excluded

Named so you can overrule them explicitly rather than wondering whether I forgot:

- **E2E / Playwright, component tests, Supabase-mocking integration tests** — disproportionate at
  this cadence; the pure core holds the actual bugs.
- **Automated deploys for migrations and edge functions** — both can destroy data or spend money.
  Human-gated for now, deliberately.
- **CODEOWNERS, changelog automation, semantic-release, commitlint, Dependabot, per-ADR files** —
  solo-developer overhead with no reader.
- **Error monitoring (Sentry) and a cron dead-man's-switch** — genuinely valuable, and the biggest
  operational gap after S-1 (§1.4: nothing tells you when the daily send stops). Excluded from the
  *readiness* scaffolding because it's product operations, not agent-readiness. **Recommend it as
  an early v1 ticket** — a free-tier uptime monitor pinging a health endpoint is ~30 minutes.
- **Renaming/restructuring `src/`** — churn without benefit; the current layout is conventional.

---

## What I need from you

1. **Approve or amend the docs tree** (§3.1) — especially the deletion list.
2. **Confirm the shared-core direction** (§3.2), or tell me to take the simpler two-suite route.
3. **Confirm the sequencing** (§3.7), in particular that S-1 is the right proving-run ticket.
4. **Pick a Node version** to settle the .nvmrc/README/local drift.

No implementation has begun and none will until you've reviewed this.
