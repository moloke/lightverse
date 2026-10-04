# LightVerse — v1 Roadmap

**What v1 is:** the thing the brief calls the entire thesis — it texts you a verse each morning,
you reply to recall it, and **older verses come back before you forget them**. Scope and trade-offs
are settled in [`product/v1-brief.md`](product/v1-brief.md); this page is only *order, versions, and
what you have to do by hand*.

**v1 is done when:** a paying user learns a verse to step 7, and that verse comes back on the
1 / 3 / 7 / 30 / 90-day ladder without anyone touching the database. That's it. → **`1.0.0`**

**Not in v1, deliberately:** real SM-2, per-user timezones, custom send times, a web/push free tier,
families and groups, WhatsApp, automated billing. Don't reopen these — see
[`decisions.md`](decisions.md).

---

## Where we are — `0.2.0`

**Works:** 08:00 UTC daily send · 7-step cloze ladder · phone-OTP auth · web practice · streaks
(both channels) · signature-verified webhook · CI green on every PR · `main` matches production.

**Missing:** the review engine. A verse that reaches step 7 is finished and **never comes back**.
The product currently teaches and does not remind, which is the half users would pay for.

---

## The path to 1.0.0

| # | Step | Issue | Lands as | Needs you |
|---|---|---|---|---|
| 1 | SMS streak logic shared with the web path | [#30](https://github.com/moloke/lightverse/issues/30) | `0.2.1` | merge + deploy |
| 2 | Zero-cost post-deploy smoke test | [#33](https://github.com/moloke/lightverse/issues/33) | `0.2.2` | 2 Action secrets |
| 3 | One `dayKey()` for every date decision | [#14](https://github.com/moloke/lightverse/issues/14) | `0.2.3` | deploy |
| 4 | One cloze implementation, honest docstring | [#13](https://github.com/moloke/lightverse/issues/13) | `0.2.4` | deploy |
| 5 | **Review schema** — additive migration | [#34](https://github.com/moloke/lightverse/issues/34) | `0.2.5` | **apply migration** |
| 6 | **Review engine** — the ladder + scheduler | [#35](https://github.com/moloke/lightverse/issues/35) | **`0.3.0`** | deploy + watch |
| 7 | Strip emoji — halves SMS cost | [#20](https://github.com/moloke/lightverse/issues/20) | `0.3.1` | **pick the copy** |
| 8 | Word-level feedback — *only if quick* | not yet raised | `0.4.0` | deploy |
| 9 | Stripe payment link, accounts marked by hand | not raised — not code | — | **all yours** |
| 10 | Launch | — | **`1.0.0`** | your call |

**Step 6 is v1.** Everything above it is making the ground safe to build on; everything below is
polish or commerce. If you only ship one thing, ship 6.

**Anytime, unblocked, not on the critical path:** [#18](https://github.com/moloke/lightverse/issues/18)
(webhook tests) · [#22](https://github.com/moloke/lightverse/issues/22) (lint cleanup) ·
[#15](https://github.com/moloke/lightverse/issues/15) (local DB — needs Docker, and makes step 5
verifiable rather than hopeful).

Why this order: dates before the review engine, because the engine is all date arithmetic
(step 3 → 6). Cloze before emoji, because they edit the same copy (4 → 7). Schema before logic, so
a migration PR is reviewable as a migration (5 → 6). Smoke test early, because it's what makes
hands-off deploys safe (2).

---

## What only you can do

Collected here so nothing hides in a ticket.

1. **Merge PRs.** Nothing else merges them — `main` is protected and requires CI green.
2. **Deploy edge functions** after any merge touching `supabase/functions/`:
   `npx supabase functions deploy receive-sms-webhook --no-verify-jwt` (the flag is mandatory).
   Then **send a real text** — non-optional, see [`decisions.md`](decisions.md) `2026-09-19`.
3. **Apply migrations by hand** in the Supabase SQL editor. Step 5 is the only one planned.
   Never an agent.
4. **Add two Action secrets** for step 2: `TWILIO_AUTH_TOKEN`, `TWILIO_WEBHOOK_URL`.
   None exist today.
5. **Decide on auto-deploying edge functions** (not migrations). This reverses readiness-plan §3.8.
   If yes, create a `SUPABASE_ACCESS_TOKEN` secret. Step 2 must land first — it's the only check
   that catches the #25 class.
6. **Pick the copy for step 7.** Stripping emoji halves the bill but they carry the correct/
   incorrect signal; the replacement wording is a taste call. Ask for drafted options.
7. **Watch the first review-engine send** (step 6). It changes what the 08:00 cron sends to every
   user. Nothing alerts you if it goes wrong, and every extra message is money.
8. **Billing**, start to finish: Stripe link, marking accounts paid, deciding when trials end.
9. **Install Docker** if you want step 5 verified against a real replay rather than by eye.

---

## Version rules, in one line

`feat` → minor, everything else → patch, and **"does a user gain a new capability?"** overrides the
commit type. Hence step 5 is a patch despite being a feature: a schema change ships nothing a user
can see. Full rules: [`workflow/versioning.md`](workflow/versioning.md). `1.0.0` means launched.
