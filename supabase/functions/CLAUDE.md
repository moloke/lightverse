# CLAUDE.md — `supabase/functions/`

Rules for the two Deno edge functions. The root `CLAUDE.md` still applies; this file adds what is
different in here. **Read it before editing anything under this directory.**

## This code spends real money

`_shared/twilio.ts` posts to the Twilio REST API. Every message it sends is billed, at roughly
£2.50–6/user/month to serve (see `docs/product/v1-brief.md`). There are **five** call sites, and
one of them fires for people who aren't even users:

| Where | Trigger |
|---|---|
| `daily-send-sms/index.ts:151` | The 08:00 UTC cron, once per active session |
| `receive-sms-webhook/index.ts:193` | **Sender's number is not in `users`** — replies to an arbitrary number |
| `receive-sms-webhook/index.ts:228` | User has no active session |
| `receive-sms-webhook/index.ts:284` | Correct answer |
| `receive-sms-webhook/index.ts:298` | Incorrect answer |

Before you add a code path here, answer: *can this send an SMS, and how many?* A loop that sends
per row is a loop that bills per row. Note also that `sendSMS` prepends `LIGHTVERSE: ` to every
body (`_shared/twilio.ts:33`), so those 12 characters land in every segment you pay for.

## Deno, not Node

- **URL imports only.** `https://deno.land/std@0.168.0/http/server.ts`,
  `https://esm.sh/@supabase/supabase-js@2`. There is no `node_modules` in here and no
  `package.json` governing it — the root one does not apply.
- **`Deno.env.get('NAME')`**, never `process.env`. Missing values currently fall back to `''`
  rather than throwing (`_shared/supabase.ts:5-6`, `_shared/twilio.ts:9-11`).
- **No Node built-ins** — no `fs`, `path`, `crypto` as a Node import. Use web APIs
  (`fetch`, `btoa`, `URLSearchParams`, Web Crypto), which is what the existing code does.
- **Relative imports need the `.ts` extension** (`../_shared/twilio.ts`). Deno requires it.
- **Nothing typechecks this directory.** The root `tsconfig.json` lists `supabase/functions` under
  `exclude`, so `tsc --noEmit` skips it entirely. `npm run check:edge` (`deno check`) is the only
  gate — and Deno is not installed on this machine by default; CI installs it via
  `denoland/setup-deno`.
- Your editor will show spurious TypeScript errors on these files because it resolves them as
  Node. That's expected. A `.vscode/settings.json` with `"deno.enable": true` and
  `"deno.enablePaths": ["./supabase/functions"]` silences it.

## The webhook's two halves — never separate them

`receive-sms-webhook` is deployed **`--no-verify-jwt`**:

```bash
supabase functions deploy receive-sms-webhook --no-verify-jwt   # REQUIRED
```

That flag is mandatory, because Twilio sends no Supabase JWT — without it every inbound message
401s and the product silently stops working.

**It is also exactly why the function must verify Twilio's request signature.** The flag removes
the platform's only authentication; the signature check is what replaces it. Today
**the signature check does not exist** — the handler reads `req.formData()` and goes straight to
the database (`receive-sms-webhook/index.ts:168-180`). That makes the URL an open SMS relay: any
`POST` with an unknown `From` gets a reply SMS sent to that number, on your bill.

So: `--no-verify-jwt` and `X-Twilio-Signature` verification are one decision, not two. If you find
yourself removing either half, stop. Verification is HMAC-SHA1 over the full request URL plus the
sorted POST parameters, keyed on the Twilio auth token, compared against the `X-Twilio-Signature`
header — and it must run **before** any database or Twilio call.

## Shared logic

`_shared/` holds runtime helpers (`cors.ts`, `supabase.ts`, `twilio.ts`). New **business** logic —
cloze building, answer validation, date keys, review scheduling, message copy — belongs in
`_shared/core/` as pure, runtime-agnostic functions: no `Deno.*`, no `fetch`, no Supabase client.
That directory does not exist yet; the first ticket that needs it creates it. The point is that
Next imports the same file, so the logic is written once and tested once. See
`docs/engineering/testing.md`.

## Deploying

Human-run only. Never deploy from an agent session. The procedure, rollback, and the cron and
Twilio wiring are in `docs/runbook.md`.
