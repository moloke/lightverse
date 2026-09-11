# Architecture

How LightVerse actually works today. Product intent lives in
[`product/v1-brief.md`](product/v1-brief.md); this file describes the system as built. If the two
disagree, the brief wins and this file is stale — fix it.

Everything below was read out of the tree. Where behaviour is wrong or surprising, it is marked
**[defect]** rather than tidied up.

---

## 1. Topology

Four systems. Three of them are configured outside this repo.

```
                        ┌──────────────────────────────────────┐
                        │  Vercel — Next.js 15 App Router      │
   Browser ─────────────│  src/app  (pages, API routes,        │
   (Supabase cookie)    │            server actions)           │
                        │  src/middleware.ts → auth gate       │
                        └──────────────┬───────────────────────┘
                                       │ anon key + RLS
                                       ▼
   ┌───────────────────────────────────────────────────────────────────┐
   │  Supabase (project ref lives in the dashboard, not here)          │
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

**Not in version control, and therefore invisible unless you open a dashboard:** the pg_cron
schedule, the Twilio webhook binding, every Supabase secret, every Vercel env var, and the fact
that migrations are applied by hand in the SQL editor. See [`runbook.md`](runbook.md).

The user-facing domain is **lightverse.org** — that is what the SMS copy points people at
(`receive-sms-webhook/index.ts:196`, `:231`).

---

## 2. The daily loop, end to end

| # | Step | Code | Notes |
|---|---|---|---|
| 1 | pg_cron fires `0 8 * * *` UTC | *dashboard only* | `net.http_post` to the function, service-role key in the header |
| 2 | Fetch work | `daily-send-sms/index.ts:55-76` | Every `verse_sessions` row with `completed_at IS NULL` and `users.account_disabled = false`. Inner-joins `users` and `bible_verses`. No pagination, no batching. |
| 3 | Skip paused | `:110-117` | Skips while `paused_until > now()` |
| 4 | Skip already-sent-today | `:119-131` | Compares `last_message_at` to **runtime-local** Y/M/D. Correct only because the Deno runtime is UTC — **[defect]**, it reads as correct and would lie off-UTC |
| 5 | Build cloze | `:7-42` | Hides a **random** `[0, .15, .30, .45, .60, .75, .90][step-1]` fraction of words, each replaced by `_____`. Step 1 returns the verse verbatim. Unseeded, so re-sending a step hides different words |
| 6 | Compose + send | `:142-155` | `📖 <ref> (<translation>) - Step N/7`, cloze, `Reply with the full verse to continue! 💪`. Emoji force 70-char UCS-2 segments — **[defect]**, the brief flags this as a free cost win |
| 7 | Log + mark sent | `:166-182` | Inserts `sms_logs`, then sets `last_message_at` and `awaiting_reply = true` — **after** the send and outside any transaction, so two overlapping runs both send **[defect]** |
| 8 | User replies | Twilio → webhook | Form-encoded `POST`, **unauthenticated** (`--no-verify-jwt`) and **unverified** (no signature check) — **[defect]**, see [`engineering/security.md`](engineering/security.md) |
| 9 | Identify sender | `receive-sms-webhook/index.ts:176-200` | Exact string match on `users.phone_number = From`. Unknown → logs it and **sends an SMS to that number** |
| 10 | Find active session | `:203-235` | `.single()` on the one active session. `awaiting_reply` is written but **never read** — **[defect]**, nothing stops seven replies in one afternoon |
| 11 | Validate | `:65-68` via `:19-63` | Whole-string Levenshtein ≥ 0.85 over normalised **characters**, against the full verse at every step — **[defect]**, a 150-char verse tolerates ~22 characters of error |
| 12 | Advance | `:71-155` | `current_step + 1`; XP +10, +100 more on completion; streak read-modify-write on a UTC day key |
| 13 | Reply to user | `:263-299` | Success or encouragement SMS; wrong answers get the first 5 words as a hint. Returns empty TwiML (`:7-16`) |

**On completion:** `nextStep > 7` sets `completed_at` and writes `current_step: 7`
(`receive-sms-webhook/index.ts:78, 87`). `verse_sessions.current_step` carries a
`CHECK (current_step >= 1 AND current_step <= 7)`, so **a finished session reads step 7, not 8** —
completion is signalled by `completed_at`, never by the step number. Don't write code that waits
for an 8.

---

## 3. The parallel web loop

`/practice/[sessionId]` is a **second, independent implementation** of the same mechanic, and it
does not agree with the SMS path.

```
practice/[sessionId]/page.tsx
  └─ PracticeInterface.tsx  ──▶ updateProgress()   (server action, verse-actions.ts:92)
       └─ ClozeDisplay.tsx  ──▶ createClozeTest()  (cloze-deletion.ts:115)
```

- `ClozeDisplay` builds its own cloze and grades **per word by exact match** after stripping
  trailing punctuation (`ClozeDisplay.tsx:46-58`) — stricter and more informative than the SMS
  path's whole-string fuzzy match, and the better basis for the brief's word-level feedback.
- `updateProgress` re-implements step advancement, XP and streaks
  (`verse-actions.ts:92-192`).
- **[defect] The web path never updates a streak.** It writes a `date` column
  (`verse-actions.ts:170`, `:183`) that migration `009` removed and replaced with
  `last_activity_date`. The write fails, and the error is bound to an unused variable and
  discarded. Practising on the web builds no streak; only SMS replies do.

---

## 4. Data model

Six tables, RLS enabled on every one. Applied by hand, forward-only. Per-policy detail is in
[`engineering/security.md`](engineering/security.md).

| Table | Key columns | Migration |
|---|---|---|
| `users` | `id` → `auth.users`, `phone_number` UNIQUE, `name`, `paused_until`, `account_disabled`, `total_xp`, timestamps | 001, +006, +008 |
| `bible_verses` | `reference`, `text`, `translation` (default `'ESV'`) | 002 |
| `verse_sessions` | `user_id`, `verse_id`, `current_step` (CHECK 1–7), `total_steps`, `last_message_at`, `completed_at`, `awaiting_reply` | 003 |
| `sms_logs` | `user_id` (nullable), `direction` (CHECK inbound/outbound), `phone_number`, `message`, `status`, `twilio_sid`, `error_message` | 004 |
| `streaks` | `user_id` UNIQUE, `current_streak`, `last_activity_date` | 005, rebuilt by 009 |
| `support_tickets` | `user_id` → **`auth.users`**, `ticket_type`, `subject`, `description`, `status`, `priority` | 007 |

Notable constraints and their consequences:

- **One active session per user** — a partial unique index on `verse_sessions(user_id) WHERE
  completed_at IS NULL` (003). `startSession` deletes any existing active session before
  inserting (`verse-actions.ts:46-51`), which is what keeps that index satisfied.
- **`streaks` is one row per user**, not one per day — a unique index on `user_id` (009). The
  original 005 shape was one row per user per day with a `date` and `succeeded`. Migration 009
  reached the current shape with `DROP TABLE ... CASCADE`, destroying every existing streak.
- **`support_tickets` is the odd one out**: the only table FK'd to `auth.users` rather than
  `public.users`, and the only one using `uuid_generate_v4()` (which needs the `uuid-ossp`
  extension) instead of `gen_random_uuid()`. On a fresh database, 007 may fail — nobody would
  notice, because migrations are never replayed from zero.
- **No review or spacing columns exist anywhere.** `verse_sessions` has no `next_review_at` and no
  learning-vs-review distinction. v1's headline feature lands here, additively.

`supabase/seed.sql` seeds 20 ESV verses.

---

## 5. Auth

Supabase phone OTP. `src/middleware.ts` runs `updateSession` on every non-static request; it
refreshes the session and redirects unauthenticated users to `/login`
(`lib/supabase/middleware.ts:46-57`).

**The gate exempts `/`, `/login`, `/verify`, and everything under `/api`.** API routes therefore
authenticate themselves — `/api/profile/*` and `/api/support/submit-ticket` each call
`supabase.auth.getUser()` and 401 without one. `/api/auth/send-otp` and `/api/auth/verify-otp` are
unauthenticated by nature. A new API route gets no protection for free; add the check.

`verify-otp` also creates the `public.users` profile row on first login
(`verify-otp/route.ts:46-57`).

---

## 6. Email (support tickets)

A second outbound channel, separate from SMS and easy to miss:

```
SupportTicketDialog → POST /api/support/submit-ticket
                        ├─ insert into support_tickets
                        └─ sendSupportTicketEmail()  (lib/email/client.ts)
                              └─ nodemailer → Zoho SMTP
```

Fires only when `SUPPORT_NOTIFICATION_EMAIL` is set; otherwise it logs a warning and skips
(`submit-ticket/route.ts:79-99`). A send failure is caught and logged — the ticket still saves.
Config lives in [`runbook.md`](runbook.md).

---

## 7. Dead code — do not treat as documentation

Verified by searching for every importer. These files describe behaviour the product does not
have, which makes them actively misleading:

| Symbol | File | Status |
|---|---|---|
| `generateClozeText` | `src/lib/utils/cloze-deletion.ts:44` | **Dead.** Prefix truncation — shows the first N words, then one run of up to 25 underscores. Imported nowhere |
| The file's header docstring | `src/lib/utils/cloze-deletion.ts:3-14` | **Wrong.** Describes the dead function above; its percentages mean *visible*, while both live implementations use them as *hidden* |
| `getExpectedText`, `generateHint`, `isComplete`, `getNextStep` | `cloze-deletion.ts` | Dead — never imported |
| `validateResponse`, `getFirstWords` | `src/lib/utils/text-utils.ts` | Dead — the webhook has its own local copy |
| `countWords` | `text-utils.ts:93` | Imported by `cloze-deletion.ts:1`, never called |
| **The entire `src/lib/twilio/client.ts`** | — | **Dead. A fourth SMS implementation**, imported by nothing. Has its own `LIGHTVERSE: ` prefix, its own emoji copy, and its own `sendOTP`/`sendDailyVerse`/`sendCongratulations`/`sendEncouragement` |

So the cloze algorithm exists **three** times (`daily-send-sms/index.ts:7`,
`cloze-deletion.ts:115`, `cloze-deletion.ts:44`) and SMS sending exists **twice**
(`_shared/twilio.ts`, `src/lib/twilio/client.ts`). The live copies have no shared source and
nothing stops them drifting further. Consolidating into `_shared/core/` is v1 work the brief
already schedules — see [`engineering/testing.md`](engineering/testing.md).
