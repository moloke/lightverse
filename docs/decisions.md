# Decisions

**Append-only.** Add to the bottom; never rewrite or delete an entry. If a decision is reversed,
add a new entry that says so and link back.

This file exists to prevent the most expensive failure mode available to an agent: helpfully
"fixing" something that was decided on purpose. If the code looks wrong and it's listed here, it
isn't wrong — it's deliberate. Argue with it in a ticket, not in a commit.

Entries seeded from `product/v1-brief.md` and from the code as built are dated by when they were
recorded here, not when they were originally made.

---

### 2026-09-10 · SMS is the product, not a delivery detail

Every competitor is an app you open. Living in the user's text messages is the only differentiated
ground available, so SMS cost is a designed-in constraint rather than a problem to engineer away.
**Rejected:** building a web/push app to cut cost — that is competing with free, mature,
nonprofit-backed incumbents on their turf. *(brief: "The wedge")*

### 2026-09-10 · UK-only, 08:00 UTC, no per-user timezones

One cron at `0 8 * * *` UTC serves everyone. Fine for Britain; wrong everywhere else.
**Rejected:** per-user timezone columns and multi-slot scheduling — real work, no v1 value while
every user is in one country. **Consequence:** date handling should still be routed through a
single `dayKey(date, timeZone)` helper so the assumption is explicit and one-parameter reversible,
rather than scattered and accidental. *(brief: "Defer ruthlessly")*

### 2026-09-10 · A crude fixed-interval review ladder, not SM-2

Spaced review is v1's headline feature, but the ladder is fixed: **1 / 3 / 7 / 30 / 90 days**.
**Rejected:** a real SM-2 implementation — it produces the identical "it caught me before I forgot"
moment at several times the cost. Revisit once the crude ladder is validated. *(brief: "v1 scope")*

### 2026-09-10 · Billing is concierge, not built

A Stripe payment link and marking accounts paid by hand. **Rejected:** subscription automation,
trial-expiry logic and dunning — weeks of work to serve a handful of users. **Trigger to revisit:**
enough paying users that manual billing hurts. *(brief: "Fake it, don't build it")*

### 2026-09-10 · Trial-to-paid, no permanent free tier; floor ~£4.99

SMS costs roughly £2.50–6/user/month to serve, which sets a price floor independent of
willingness-to-pay. The trial is ~4–5 weeks so that at least one review *save* happens before it
ends. **Rejected:** £1.99 — below cost to serve. **Tripwire:** at ~100 paying users or a set monthly
Twilio spend, the margin conversation reopens automatically. *(brief: "The business model")*

### 2026-09-10 · Solo adults in v1; families and children are v2

**Rejected:** serving families now — a genuinely different product (parent-managed, web-based,
different buyer) that would dissolve the sharp thing that makes LightVerse work. **Consequence
already honoured in the schema:** an account is a *profile that has a phone number*
(`users.id` → `auth.users`, with `phone_number` as a column), not a profile that *is* a phone
number — so families later is an added feature, not an auth rewrite. *(brief: "Who it's for")*

### 2026-09-10 · WhatsApp is roadmap, gated on cost — not now

Structurally ~10x cheaper, since only the proactive daily send is billed. **Trigger to build:** the
cost tripwire above, not "now" — at nine users the saving is pennies and the build is weeks. Worth
one afternoon early to submit a template and learn whether Meta classifies the daily verse as
utility or marketing. *(brief: "Roadmap")*

### 2026-09-10 · Seven steps, hiding a random fraction of words

`[0, .15, .30, .45, .60, .75, .90]` hidden at steps 1–7; step 1 sends the verse verbatim. Both live
implementations agree (`daily-send-sms/index.ts:7`, `cloze-deletion.ts:115`). **Note:** the
docstring at `cloze-deletion.ts:3-14` describes a *third, dead* prefix-truncation implementation
whose percentages mean *visible* — it documents behaviour the product does not have. Believe the
code, not that comment. **Open:** the hiding is unseeded, so re-sending a step hides different
words.

### 2026-09-10 · One active verse per user

Enforced by a partial unique index on `verse_sessions(user_id) WHERE completed_at IS NULL`
(migration 003). Starting a new verse **deletes** the previous active session
(`verse-actions.ts:46-51`). **Rejected:** multiple concurrent verses — one focus is the simpler
product and the simpler daily-send query.

### 2026-09-10 · `sms_logs` is deny-all to users, deliberately

RLS is enabled with **zero policies**, so only the service role can read it (migration 004). It is
the audit trail for a system that spends money, and it retains full message bodies. This is not a
missing policy — do not "fix" it by adding one.

### 2026-09-10 · The webhook deploys `--no-verify-jwt`, and therefore must verify the Twilio signature

Twilio sends no Supabase JWT, so the flag is mandatory or inbound replies all 401. The flag removes
the platform's only authentication, which is precisely why request-signature verification is
required in its place. **These are one decision, not two — never separate them.** Signature
verification is **not implemented today**; until it is, the URL is an open SMS relay.
**Rejected:** a shared-secret query parameter — simpler, but weaker and non-standard for roughly
the same effort.

### 2026-09-10 · Migrations are forward-only and additive, applied by hand

No `DROP TABLE`, `DROP COLUMN`, `TRUNCATE`, or lossy type change. This rule was bought with data:
`009` dropped and rebuilt `streaks`, destroying every user's history, and the bug it claimed to fix
survived anyway. Applied manually in the Supabase SQL Editor; never by an agent, never
automatically. *(see [`runbook.md`](runbook.md))*

### 2026-09-10 · Deploys stay manual and human-gated

Vercel auto-deploys the web app; edge functions, migrations and the cron schedule do not.
**Rejected:** automating them — these are the paths that can drop tables and spend money, and
handing an agent an automated route to production is the wrong trade this early. CI gates quality;
it does not deploy.

### 2026-09-10 · One shared core, tested once with Vitest

Business logic that both runtimes need goes in `supabase/functions/_shared/core/` as pure
functions: Deno imports it directly, Next imports it via a path alias, and one Vitest suite covers
both. **Rejected:** Jest (slower, awkward with ESM+TS) and a second `deno test` suite (it would
retest the same pure functions). `deno check` runs in CI instead, since nothing typechecks the edge
functions today. *(see [`engineering/testing.md`](engineering/testing.md))*

### 2026-09-10 · Tickets live in `docs/tickets/`, not GitHub Issues

An in-repo ticket sits in the same context as the code and the tests it describes, at no API cost.
**Rejected:** GitHub Issues — better for tracking, worse for agents. Mirror later if it's ever
worth it.

### 2026-09-10 · The domain is lightverse.org

SMS copy points users at `lightverse.org` (`receive-sms-webhook/index.ts:196`, `:231`). Older
documents said `lightverse.app`; those are superseded and have been retired to `docs/_legacy/`.

### 2026-09-10 · Tickets move to GitHub Issues — reverses the `docs/tickets/` decision above

**Reverses** "Tickets live in `docs/tickets/`, not GitHub Issues" (this file, above) and
readiness-plan §3.6, which had chosen in-repo tickets and named GitHub Issues the rejected
alternative. GitHub Issues is now the **single** ticket surface: `docs/tickets/` is retired, its
template is `.github/ISSUE_TEMPLATE/ticket.md`, and the issue number is the ticket id that names
the branch (`<type>/<issue-number>-<slug>`).

**Why the reversal:** the agent skills (`/to-tickets`, `/triage`, `/to-spec`, `/wayfinder`) are
built to read and write a real tracker, and two surfaces meant every ticket needed writing twice
with no rule for which won. The original objection — that an in-repo ticket sits in the same
context window as the code, at no API cost — is real but cheap to pay: `gh issue view <n>` is one
command. **Consequence:** the ticket body shape is unchanged, so nothing is lost but the file
location. Tracker config is in [`agents/issue-tracker.md`](agents/issue-tracker.md).

### 2026-09-10 · `docs/_legacy/` is a local-only archive, not repo content

The 11 stale documents the readiness plan (§3.7 phase 0) told us to delete were **moved** to
`docs/_legacy/` and gitignored (`.gitignore:52`) rather than deleted outright — a safety net while
`architecture.md`, `runbook.md`, `v1-brief.md` and this file were being written from them.

**Never track it.** Two reasons. It holds a live-shaped anon JWT and the production project ref
(now redacted locally), and those have never been committed — 22 commits scanned, all file types,
clean. That property is worth keeping. And its contents *contradict* the current docs rather than
merely duplicating them: `task.md` shows the edge functions unbuilt, `DEPLOYMENT_GUIDE.md`
instructs creating migration `006` which is already the profile-fields migration. Committing it
would re-arm M-2 — false premises an agent will act on (`CLAUDE.md` rule 7).

**Rule 6 is satisfied, not bent:** no surviving knowledge lives only in `_legacy`. Everything it
had is in the docs above. Entries and docs may mention it for provenance, but nothing should
*depend* on it — treat any `docs/_legacy/...` path as unreadable.

**Trigger to delete:** once issues
[#10](https://github.com/moloke/lightverse/issues/10)-[#15](https://github.com/moloke/lightverse/issues/15)
have landed and nothing further is needed from it, `rm -rf docs/_legacy/`. A local scratch archive
is legitimate, but it has a shelf life. *(supplements "The domain is lightverse.org" above, which
cites the directory for provenance; see also [`engineering/security.md`](engineering/security.md) §3)*

### 2026-09-19 · Shared-core imports use `.ts` extensions; the web side will need `allowImportingTsExtensions`

The spike flagged in [`engineering/testing.md`](engineering/testing.md), run as part of issue #10.

**The conflict is real.** Deno *requires* an explicit `.ts` extension on relative imports; TypeScript
*rejects* one by default (`TS5097: An import path can only end with a '.ts' extension when
'allowImportingTsExtensions' is enabled`). A module in `_shared/core/` imported by both runtimes
cannot satisfy both with one import specifier.

**Resolution, verified rather than assumed:** set `"allowImportingTsExtensions": true` in
`tsconfig.json`. It requires `noEmit: true`, which this project already sets, so it costs nothing.
With the flag on, `import { dayKey } from '../supabase/functions/_shared/core/dates.ts'`
typechecks clean; without it, that exact import is an error. Both were run.

**Not applied yet, deliberately.** Nothing in `src/` imports the shared core today, so adding the
flag now would be a change with no consumer. It lands with the first web-side import — #13 (cloze
consolidation) or #14 (`dayKey` adoption), whichever comes first. **Rejected:** dropping the
extension and configuring Deno to tolerate it (fights the runtime's defaults), and a build step
that rewrites specifiers (a compile step for four pure functions).

**Consequence:** inside `supabase/functions/`, always write the `.ts` extension — that is the form
that works in both places once the flag is set. `_shared/core/dates.test.ts` already does.

### 2026-09-19 · A deploy on the SMS path is not done until a real text gets a real reply

**The rule:** after deploying either edge function, send a real SMS to the LightVerse number and
confirm a real reply arrives. Only then is the work finished. Not the tests passing, not a green
CI run, not a successful `functions deploy`.

**Why, specifically.** Issue #11 (Twilio signature verification) shipped with 33 passing tests
whose expected digest was cross-checked against Twilio's *own SDK*, and it still took inbound
replies down for 55 minutes (#25). `req.url` inside a Supabase edge function is
`http://<ref>.supabase.co/receive-sms-webhook` — TLS terminates at the proxy, the `/functions/v1`
prefix is stripped — while Twilio signs the console URL, which has both. **No test could have
caught it.** The proxy is invisible from the test bench; the only place that behaviour exists is
production.

Two messages were lost. With a larger user base it would have been a day's worth.

**The general form:** a green gate proves the code does what we asked. It proves nothing about what
the platform does to the request before the code sees it. For anything whose correctness depends on
a runtime we don't control, "tests pass" is necessary and never sufficient.

**Consequence, accepted deliberately:** signature verification fails *closed*, so a configuration
mismatch presents as an outage rather than a vulnerability. That is the right trade — the
alternative is an open SMS relay — but it is exactly what makes the post-deploy check
non-optional. **Rejected:** automating it as a smoke test. Deploys are human-run and human-gated
(see the entry above), so the check belongs with the human doing the deploy; automating it would
need a test number, a live send per deploy, and its own failure modes. Revisit if deploys ever
stop being manual.

**When it fails:** Twilio's console shows `error_code` 11200 on the inbound message, and
`sms_logs` has no row for it at all — a rejected request returns before any database write. That
pair distinguishes "rejected at the gate" from "accepted but no reply", which are different bugs.
See [`runbook.md`](runbook.md).
