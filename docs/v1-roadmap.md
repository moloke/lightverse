# LightVerse — v1 Roadmap

**What v1 is:** the thing the brief calls the entire thesis — it texts you a verse each morning,
you reply to recall it, and **older verses come back before you forget them**. Scope and trade-offs
are settled in [`product/v1-brief.md`](product/v1-brief.md); this page is only *order, versions, and
what you have to do by hand*.

**v1 is done when:** a paying user learns a verse to its last cloze step, and that verse comes back on the
1 / 3 / 7 / 30 / 90-day ladder without anyone touching the database. That's it. → **`1.0.0`**

**Not in v1, deliberately:** real SM-2, per-user timezones, custom send times, a web/push free tier,
families and groups, WhatsApp, automated billing. Don't reopen these — see
[`decisions.md`](decisions.md).

---

## Where we are — `0.2.0`

**Works:** 08:00 UTC daily send · 7-step cloze ladder · phone-OTP auth · web practice · streaks
(both channels) · signature-verified webhook · CI green on every PR · `main` matches production.

**Missing:** the review engine. A verse that reaches its last cloze step is finished and **never comes back**.
The product currently teaches and does not remind, which is the half users would pay for.

---

## The path to 1.0.0

| # | Step | Issue | Lands as | Needs you |
|---|---|---|---|---|
| 1 | SMS streak logic shared with the web path | [#30](https://github.com/moloke/lightverse/issues/30) | `0.2.1` | merge + deploy |
| 2 | Zero-cost post-deploy smoke test | [#33](https://github.com/moloke/lightverse/issues/33) | `0.2.2` | 2 Action secrets |
| 3 | One `dayKey()` for every date decision | [#14](https://github.com/moloke/lightverse/issues/14) | `0.2.3` | deploy |
| 4 | One cloze implementation, honest docstring | [#13](https://github.com/moloke/lightverse/issues/13) | `0.2.4` | deploy |
| 5 | **Fast-forward mode** — a week's journey in minutes | [#38](https://github.com/moloke/lightverse/issues/38) | `0.2.5` | 1 secret, your number |
| 6 | **Review schema** — additive migration | [#34](https://github.com/moloke/lightverse/issues/34) | `0.2.6` | **apply migration** |
| 7 | **Review engine** — the ladder + scheduler | [#35](https://github.com/moloke/lightverse/issues/35) | **`0.3.0`** | deploy + watch |
| 8 | Strip emoji — halves SMS cost | [#20](https://github.com/moloke/lightverse/issues/20) | `0.3.1` | **pick the copy** |
| 9 | Word-level feedback — *only if quick* | not yet raised | `0.4.0` | deploy |
| 10 | Stripe payment link, accounts marked by hand | not raised — not code | — | **all yours** |
| 11 | Launch | — | **`1.0.0`** | your call |

**#35 is v1.** Everything above it makes the ground safe to build on; everything below is polish or
commerce. If you only ship one thing, ship #35.

**#38 is what makes #35 testable.** Today the loop is 24 hours: reply, advance, wait for the 08:00
cron — so a verse takes a week to reach its last cloze step, and the review ladder takes a month.
Fast-forward mode sends the next message immediately for an allowlisted number, so the whole journey
takes minutes with the real copy and the real grading. It sits after #13 because it needs the shared
message builder that #13 creates.

*(Rows are referred to by issue number, not row number. "Step" in this repo means a cloze step —
the `Step 3/7` a user sees in a text — and reusing the word for roadmap rows invites exactly the
confusion this document exists to remove.)*

**Anytime, unblocked, not on the critical path:** [#18](https://github.com/moloke/lightverse/issues/18)
(webhook tests) · [#22](https://github.com/moloke/lightverse/issues/22) (lint cleanup) ·
[#15](https://github.com/moloke/lightverse/issues/15) (local DB — needs Docker, and makes #34
verifiable rather than hopeful).

Why this order: dates before the review engine, because the engine is all date arithmetic
(#14 → #35). Cloze before both emoji and fast-forward, since they share its copy and its message
builder (#13 → #20, #13 → #38). Fast-forward before the review engine, so the engine can be
exercised by hand rather than by waiting (#38 → #35). Schema before logic, so a migration PR reviews
as a migration (#34 → #35). Smoke test early, because it is what makes hands-off deploys safe
(#33).

All of these are recorded as GitHub issue dependencies, so the next unblocked ticket is derivable
rather than a decision.

---

## What only you can do

Collected here so nothing hides in a ticket. Step numbers refer to the table above.

1. **Merge PRs.** Nothing else merges them — `main` is protected and requires CI green.
2. **Deploy edge functions** after any merge touching `supabase/functions/`:
   `npx supabase functions deploy receive-sms-webhook --no-verify-jwt` (the flag is mandatory).
   Then **send a real text** — non-optional, see [`decisions.md`](decisions.md) `2026-09-19`.
3. **Apply migrations by hand** in the Supabase SQL editor. **#34** is the only one planned.
   Never an agent.
4. **Add two Action secrets** for **#33**: `TWILIO_AUTH_TOKEN`, `TWILIO_WEBHOOK_URL`.
   None exist today.
5. **Turn fast-forward on for your number only** (**#38**), and off when you are done:
   `npx supabase secrets set TEST_FAST_FORWARD_NUMBERS=+44…`. Unsetting it kills the feature
   instantly with no deploy — that is also the rollback.
6. **Decide on auto-deploying edge functions** (not migrations). This reverses readiness-plan §3.8.
   If yes, create a `SUPABASE_ACCESS_TOKEN` secret. **#33 must land first** — it is the only
   check that catches the #25 class.
7. **Pick the copy for #20.** Stripping emoji halves the bill, but they carry the
   correct/incorrect signal; the replacement wording is a taste call. Ask for drafted options.
8. **Watch the first review-engine send** (**#35**). It changes what the 08:00 cron sends to
   every user. Nothing alerts you if it goes wrong, and every extra message is money.
9. **Billing**, start to finish: Stripe link, marking accounts paid, deciding when trials end.
10. **Install Docker** if you want **#34** verified against a real migration replay rather than
    by eye.

---

## Testing at two speeds

Once #38 lands there are two different things to verify, and conflating them is how a bug ships:

- **The compressed walk (minutes, you).** Fast-forward mode takes a verse from cloze step 1 to step
  7 in one sitting. This exercises grading, the cloze ladder, the copy and the step transitions — most of
  what a PR changes.
- **The real cadence (days, a user).** One message a morning, replies hours later, reviews days or
  months apart. Streaks only move when the **calendar** day changes, and the 1 / 3 / 7 / 30 / 90-day
  ladder cannot be reached by replying at all.

So a compressed walk passing is **not** proof the spaced experience works. Anything depending on the
calendar — streaks, review intervals, the already-sent-today guard — needs its dates moved by SQL
(see [`runbook.md`](runbook.md)), never a fake clock in function code: a code path where "now" is a
lie sits on the paid send path.

**Every PR touching the SMS path should say which of the two it verified, and which it did not.**

## Version rules, in one line

`feat` → minor, everything else → patch, and **"does a user gain a new capability?"** overrides the
commit type. Hence #34 is a patch despite being a feature: a schema change ships nothing a user
can see. Full rules: [`workflow/versioning.md`](workflow/versioning.md). `1.0.0` means launched.
