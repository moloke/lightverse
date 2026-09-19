# Runbook

How to change production without breaking it. **Everything in this file is human-run.** An agent
never applies a migration, deploys a function, or edits the cron schedule.

Every key, token and project ref below is a `<PLACEHOLDER>`. Real values live in `.env` (local,
gitignored) and in the Supabase and Vercel dashboards — never in a tracked file. When you paste a
command here into a terminal, substitute; when you paste one back into the repo, re-placeholder.

---

## Migrations

**Forward-only and additive.** Never `DROP TABLE`, `DROP COLUMN`, `TRUNCATE`, or make a lossy type
change. This is not a style preference: `009_fix_streaks_table_schema.sql` opens with
`DROP TABLE IF EXISTS public.streaks CASCADE`, and running it destroyed every user's streak
history. The code change it was "fixing" was never finished, so the data was lost *and* the bug
survived (see [`architecture.md`](architecture.md) §3). If a change appears to need a destructive
step, stop and ask.

To rename a column: add the new one, backfill, switch the code, and drop the old one later as a
separate, deliberate, human-run change.

**Procedure:**

1. New file only — **never edit a migration that has been applied.** Keep the `NNN_verb_noun.sql`
   numbering; the next free number is `010`.
2. Open it in the Supabase dashboard → SQL Editor and run it there. This is how all nine existing
   migrations were applied.
3. Confirm the change, then note it in [`decisions.md`](decisions.md) if it encodes a decision.

**Known gap:** there is no `supabase/config.toml`, so `supabase start` and `supabase db reset`
don't work and there is **no way to test a migration locally** before it hits production. Adding
that config is worthwhile precisely because it is the only thing that would catch a migration that
fails on a fresh database — `007` is a live candidate (it needs the `uuid-ossp` extension).

---

## Edge functions

### Deploy

```bash
deno check supabase/functions/**/*.ts          # nothing gates this today

supabase functions deploy daily-send-sms
supabase functions deploy receive-sms-webhook --no-verify-jwt   # REQUIRED
```

`--no-verify-jwt` is **mandatory** for the webhook: Twilio sends no Supabase JWT, so without the
flag every inbound message 401s and the product silently stops working.

That flag is also **exactly why the function must verify the `X-Twilio-Signature` header**, which
it does not do today. The flag removes the platform's authentication; the signature check is what
replaces it. Deployed as-is, that URL will send an SMS to any number a stranger posts. The two
facts belong together permanently — see [`engineering/security.md`](engineering/security.md) and
`supabase/functions/CLAUDE.md`.

### Rollback

There is no deploy history to roll back to. To revert a function: `git checkout` the previous
version of `index.ts` and deploy again. Migrations are forward-only, so a bad schema change is
undone by writing a new additive migration, not by reversing the old one.

### First-time CLI setup

```bash
npm install supabase --save-dev     # already a devDependency
npx supabase login
npx supabase link --project-ref <PROJECT_REF>
```

`npm install -g supabase` installs the JavaScript **client library**, not the CLI — a genuine trap.
Use the devDependency via `npx`, or `brew install supabase/tap/supabase`.

Deno is not installed by default on this machine; install it locally if you want to run
`npm run check:edge` before pushing. CI installs it via `denoland/setup-deno`.

### Function secrets

```bash
npx supabase secrets set TWILIO_ACCOUNT_SID=<TWILIO_ACCOUNT_SID>
npx supabase secrets set TWILIO_AUTH_TOKEN=<TWILIO_AUTH_TOKEN>
npx supabase secrets set TWILIO_PHONE_NUMBER=<TWILIO_PHONE_NUMBER>
npx supabase secrets set TWILIO_WEBHOOK_URL=<TWILIO_WEBHOOK_URL>   # the exact Twilio console URL
npx supabase secrets list
```

`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are injected by the platform.

**`TWILIO_AUTH_TOKEN` does double duty, and the second job is security-critical.** Besides
authenticating outbound sends, it is the HMAC key that
`_shared/core/twilio-signature.ts` uses to verify inbound requests. If that secret is missing or
wrong on the deployed function, **every inbound reply is rejected** — verification fails closed by
design, because an unconfigured secret must never read as "no signature required". Users would text
in and get silence, with nothing but a `console.warn` to say why. After rotating the Twilio auth
token, set it here *and* confirm a real inbound reply still works.

---

## Cron — the product's heartbeat

The daily send is scheduled in **Supabase dashboard → Database → Cron Jobs**. It is *not* in this
repo, which means it is invisible to code review and to any agent working here.

- **Name:** `daily-verse-sms`
- **Schedule:** `0 8 * * *` (08:00 UTC — the brief accepts UK-only for v1)
- **Command:**

```sql
SELECT net.http_post(
  url:='https://<PROJECT_REF>.supabase.co/functions/v1/daily-send-sms',
  headers:='{"Content-Type": "application/json", "Authorization": "Bearer <SERVICE_ROLE_KEY>"}'::jsonb
) as request_id;
```

> **Ignore the old guide's instruction to create `006_setup_daily_sms_cron.sql`.** `006` is already
> `006_add_user_profile_fields.sql`, and no cron migration exists in this repo at all. The schedule
> lives only in the dashboard.

**Two known hardening items, both currently open:**

1. **Bring the schedule into version control** as an additive migration, so a change to the
   product's heartbeat is reviewable rather than a dashboard edit nobody sees.
2. **Vault the service-role key.** Pasted inline as above, it is stored in plaintext in
   `cron.job.command` and readable by anything that can query that table. It should be read from
   Supabase Vault instead.

### Checking it ran

```sql
SELECT * FROM cron.job WHERE jobname = 'daily-verse-sms';

SELECT * FROM cron.job_run_details
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'daily-verse-sms')
ORDER BY start_time DESC LIMIT 10;
```

---

## Twilio webhook

Twilio Console → Phone Numbers → Manage → Active numbers → your number → Messaging Configuration:

- **A MESSAGE COMES IN:** Webhook
- **URL:** `https://<PROJECT_REF>.supabase.co/functions/v1/receive-sms-webhook`
- **Method:** POST

This binding exists only in the Twilio console. If it is wrong or missing, inbound replies vanish
silently — no error surfaces anywhere in this repo.

### The URL is part of the signature — and `req.url` is NOT it

Twilio signs **the URL it called**, i.e. the value configured above. Behind Supabase's edge proxy
the function sees something different:

| | |
|---|---|
| What Twilio signs (console URL) | `https://<PROJECT_REF>.supabase.co/functions/v1/receive-sms-webhook` |
| What `req.url` reports | `http://<PROJECT_REF>.supabase.co/receive-sms-webhook` |

Two differences, both upstream of the function: **TLS is terminated at the proxy**, so the scheme
is `http`; and the **`/functions/v1` prefix is stripped**. Verifying against `req.url` therefore
rejects *every* genuine request.

This is not hypothetical — it took inbound replies down on **2026-09-19** (Twilio error 11200 on
every message, users texting in to silence). `_shared/core/twilio-signature.ts` now checks the
signature against a small set of candidate URLs, and **`TWILIO_WEBHOOK_URL` should be set to the
exact console value** so the correct one is tried first:

```bash
npx supabase secrets set TWILIO_WEBHOOK_URL=https://<PROJECT_REF>.supabase.co/functions/v1/receive-sms-webhook
```

**If you change the webhook URL in the Twilio console, change this secret too.** They are one
setting in two places.

Symptom of a mismatch: users text in, nothing happens, Twilio's console shows **error 11200
(HTTP retrieval failure)** on the inbound message, and the function logs
`Rejected inbound request with an invalid or missing Twilio signature`. Diagnose by comparing the
console URL against the candidates the function builds — not by assuming the code is wrong.

The function is deployed `--no-verify-jwt` because Twilio sends no JWT. That flag is *why* the
signature check is mandatory: it is the only thing authenticating this endpoint. Never remove
either half of the pairing — see `docs/decisions.md`.

---

## When SMS stops working

Nothing alerts you. For a product whose entire promise is "it reliably texts you," assume you will
find out from a user, and check in this order:

1. **Did the cron fire?** `cron.job_run_details`, above.
2. **Did the function run?** `npx supabase functions logs daily-send-sms --tail`
   (or `receive-sms-webhook`). Free-tier retention is short — look soon.
3. **What does the app think it sent?**
   ```sql
   SELECT created_at, direction, phone_number, status, LEFT(message, 50) AS preview
   FROM sms_logs ORDER BY created_at DESC LIMIT 20;
   ```
4. **What does Twilio think?** Console → Monitor → Logs → Messaging Logs. Check the account
   balance while you're there.

Common causes, from the field:

- **Phone format mismatch.** Sender lookup is an exact string match on `users.phone_number`
  (`receive-sms-webhook/index.ts:179`). Twilio sends E.164 (`+447…`). A row stored any other way
  will never match, and the user gets "we couldn't find your account".
- **Twilio trial accounts** can only message verified numbers.
- **`daily-send-sms` returns HTTP 200 even when every send failed** — it collects errors into a
  results array and reports success regardless. A 200 is not evidence that anything was delivered;
  check `sms_logs`.

---

## Secrets — where they live

| Location | Holds | Notes |
|---|---|---|
| `.env` (local) | Everything below | Gitignored. Never commit it |
| `.env.example` (tracked) | Variable **names** only | Keep values as placeholders |
| Supabase → Edge Functions → Secrets | `TWILIO_*` | `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` injected automatically |
| Vercel → Project → Environment Variables | Everything the Next app reads | Including the SMTP set |
| Supabase `cron.job.command` | Service-role key, **plaintext** | Hardening item above |

**Env-var inventory** (from `.env.example` and the code that reads it):

| Variable | Used by |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Web — all three Supabase clients |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Web — public by design, ships to the browser |
| `SUPABASE_SERVICE_ROLE_KEY` | Edge functions — **bypasses RLS**, never expose to the browser |
| `TWILIO_ACCOUNT_SID` / `TWILIO_AUTH_TOKEN` / `TWILIO_PHONE_NUMBER` | `_shared/twilio.ts`; the auth token is also the key for signature verification |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASSWORD` / `SMTP_FROM` | `lib/email/client.ts` — Zoho, `smtp.zoho.com`, port 465 SSL (587 TLS also works) |
| `SUPPORT_NOTIFICATION_EMAIL` | `submit-ticket/route.ts` — **unset disables ticket emails silently**, with only a `console.warn` |
| `NEXT_PUBLIC_APP_URL` | Web |

Use a Zoho **app-specific password** for `SMTP_PASSWORD`, never the account password.

If a secret is ever committed: rotate it first, then clean the file. Rotation is the fix; deleting
the line is housekeeping.

---

## Vercel

The web app deploys itself — Vercel builds `main` and gives every PR a preview. `next build` is
the only thing gating that, and it does **not** run lint or tests, and it excludes
`supabase/functions` entirely. CI is what closes that gap; see
[`workflow/definition-of-done.md`](workflow/definition-of-done.md).
