# Security

Threat model for a live product with a handful of users, one developer, and an outbound channel
that costs real money. Findings are stated plainly; the fix is named where there is one.

---

## 1. The inbound webhook validates nothing — fix this first

`receive-sms-webhook` is deployed `--no-verify-jwt` (mandatory — Twilio sends no JWT) and performs
**no request-signature check**. It reads `req.formData()` and goes straight to the database
(`receive-sms-webhook/index.ts:168-180`). The URL is a stable, guessable
`https://<project-ref>.supabase.co/functions/v1/receive-sms-webhook`.

Anyone who can `POST` a form body can:

- **Send an SMS to any phone number on earth, at your expense.** `POST` with `From=<any number>`;
  the number isn't in `users`, so the function replies *to that number* with "Sorry, we couldn't
  find your account…" (`:193-197`). Unrate-limited. That is toll fraud and a harassment vector.
- **Forge progress, XP and streaks** for any user whose phone number they know — the sender is
  identified by an exact string match on `phone_number` (`:179`) and nothing else.
- **Cause an outbound SMS per request** for real users too, since every inbound triggers a reply.

**Fix:** verify `X-Twilio-Signature` — HMAC-SHA1 over the full request URL plus the sorted POST
parameters, keyed on `TWILIO_AUTH_TOKEN` — **before any database or Twilio call**, and drop unknown
senders **silently** rather than replying to them. Both halves matter: the check stops forgery, the
silent drop stops the relay.

**Never remove `--no-verify-jwt` as a "fix".** It is required for the function to work at all. The
signature check is what replaces the authentication that flag removes; they are one decision. See
[`../decisions.md`](../decisions.md).

## 2. The daily sender is triggerable by anyone with the anon key

`daily-send-sms` deploys with JWT verification on — but the anon key *is* a valid JWT and is public
by design, since it ships to every browser. Impact is bounded by the already-sent-today guard: an
attacker can make each user's message arrive early, not spam them repeatedly. But that guard is
itself racy (§5), so the bound is softer than it looks.

**Fix:** require a dedicated shared-secret header, or check that the caller's role claim is
`service_role`.

## 3. Secret handling

- `.env` is untracked and gitignored. `.env.example` is tracked and holds **names with placeholder
  values** — keep it that way.
- **Never put a live key, token, or project ref in a tracked file.** Use `<PLACEHOLDER>`. Retired
  documents that contained live values now sit in `docs/_legacy/`, which is gitignored so they can
  never be committed.
- The **service-role key bypasses RLS entirely**. It belongs only in Supabase function secrets and
  the cron job — never in anything the browser can reach.
- The cron job stores that key **inline in plaintext** in `cron.job.command`. Vaulting it is an open
  hardening item ([`../runbook.md`](../runbook.md)).
- The **anon key is public by design** — its exposure is not a breach. It is, however, what turns
  §1 and §2 from theoretical into trivial.
- If a secret is committed: **rotate first**, then clean the file. Rotation is the fix.

## 4. RLS

Enabled on all six tables. `auth.uid() = user_id` throughout.

| Table | Policies | Notes |
|---|---|---|
| `users` | SELECT / UPDATE / INSERT on `auth.uid() = id` | **UPDATE has no `WITH CHECK`** — a user could in principle rewrite their own `phone_number` or `total_xp`. Low impact today; add the clause when convenient |
| `bible_verses` | SELECT `TO authenticated USING (true)`; writes service-role only | Sound |
| `verse_sessions` | Full CRUD on `auth.uid() = user_id` | Sound |
| `sms_logs` | RLS on, **zero policies** → deny-all to users | Correct and deliberate. Do not "fix" |
| `streaks` | SELECT / INSERT / UPDATE on `auth.uid() = user_id` | Sound |
| `support_tickets` | SELECT / INSERT / UPDATE on `auth.uid() = user_id` | Sound, but FK'd to `auth.users` rather than `public.users` — inconsistent with every other table |

**Any new table gets RLS enabled in the same migration that creates it.** A table without policies
denies users by default, which is the safe direction — a table with RLS forgotten is not.

Edge functions use the service role and **bypass RLS completely**. Authorisation in those files is
whatever the code does explicitly, which today is one phone-number string match.

## 5. Input validation

What exists:

- `send-otp` validates E.164 shape: `/^\+[1-9]\d{9,14}$/` (`send-otp/route.ts:16`).
- `submit-ticket` validates email shape and allowlists `ticket_type` against
  `['bug','help','feature','other']` (`submit-ticket/route.ts:18-33`), and requires an authenticated
  user.
- Parameterised queries throughout via the Supabase client — no string-built SQL anywhere.

What doesn't:

- **The webhook validates nothing at all** — not the signature, not `From`, not `Body`. §1.
- `updateProgress(sessionId, currentStep)` takes the step **from the client** and awards XP with no
  server-side check that the answer was right (`verse-actions.ts:92-126`). A user can inflate their
  own XP. Self-inflicted and cosmetic while XP gates nothing — but it is an unvalidated write path.
- The daily send's already-sent-today guard writes `last_message_at` **after** the Twilio call and
  outside any transaction (`daily-send-sms/index.ts:166-182`), so two overlapping runs both send.
  Claim the row first with a conditional update, then send.

## 6. Lower priority, tracked

- **`Access-Control-Allow-Origin: *`** on both functions (`_shared/cors.ts`). Meaningless for the
  Twilio webhook; mildly counterproductive for the sender. Tighten or drop.
- **No rate limiting on `send-otp`.** Supabase Auth applies its own limits, so it's partially
  mitigated — but it is an unauthenticated, SMS-costing endpoint. Worth revisiting once §1 is closed.
- **`sms_logs` retains full message bodies indefinitely.** Deliberate and useful; worth a retention
  policy eventually.
- **API routes bypass the middleware auth gate.** `src/middleware.ts` exempts `/api`, so every new
  route must call `supabase.auth.getUser()` itself. Existing routes do; yours won't for free.

## Reviewing a change

Ask: does it touch the webhook, add an SMS-sending path, add an unauthenticated endpoint, write a
migration, or introduce a secret? Any yes gets a real look — see
[`../workflow/definition-of-done.md`](../workflow/definition-of-done.md).
