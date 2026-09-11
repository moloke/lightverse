# Definition of Done

A change is done when every box below is genuinely true. It's reproduced in
[`.github/pull_request_template.md`](../../.github/pull_request_template.md) so it gets ticked
where it's reviewed.

**Tick only what's actually true.** An honestly unticked box starts a useful conversation; a
dishonestly ticked one destroys the checklist's value entirely. If something doesn't apply, say
"n/a" and why.

```
- [ ] Linked to a GitHub issue (`Closes #<n>` in the PR body)
- [ ] lint, typecheck, test, check:edge and build all pass locally
- [ ] New or changed pure logic has a test; a bug fix has a test that fails without the fix
- [ ] No new secrets, keys or project refs in the diff
- [ ] Any migration is additive — or destructive and explicitly approved by a human
- [ ] Any change to an SMS-sending path states its cost impact
- [ ] Docs updated if behaviour changed (architecture / runbook / decisions)
- [ ] Deliberate decisions recorded in docs/decisions.md
```

## Why each one is here

**Linked to a ticket.** The ticket's "Out" field is what bounds the work. No ticket means no agreed
scope — open one first (`.github/ISSUE_TEMPLATE/ticket.md`) and get it approved.

**The full gate passes locally.**
`npm run lint && npm run typecheck && npm test && npm run build`, plus `npm run check:edge` if you
touched a function. Vercel's build gates neither lint nor tests and skips `supabase/functions`
entirely, so a green preview deploy proves less than it looks like it does. Note that most of these
scripts don't exist yet — [issue #10](https://github.com/moloke/lightverse/issues/10).

**Tests on pure logic.** Not on components, not end-to-end — on the pure functions in
`_shared/core/`, which is where the defects actually are. If you fixed a bug and can't write the
test that fails without your fix, you probably haven't found the bug yet.
[`../engineering/testing.md`](../engineering/testing.md)

**No secrets.** Read your own diff before pushing. `<PLACEHOLDER>` is always the answer in a tracked
file. If one slips through: rotate it, then clean it.

**Additive migrations.** No `DROP TABLE`, `DROP COLUMN`, `TRUNCATE`, or lossy type change, and never
edit an applied migration. Migration 009 destroyed every user's streak history — the rule is paid
for. If a change seems to need a destructive step, stop and ask.

**Cost impact on SMS paths.** Every code path in `supabase/functions/` can spend money, and the
unknown-sender branch spends it on people who aren't even users. State what your change does to
volume: more messages, longer messages, or an extra segment. Emoji push a message from 160-char
GSM-7 to 70-char UCS-2 and roughly double its cost.

**Docs updated.** A stale doc is worse than no doc — for an agent it's a false premise it will act
on. If behaviour changed, the doc that described it changed too.

**Decisions recorded.** If you chose between real alternatives, write three lines in
[`../decisions.md`](../decisions.md) — what, why, what you rejected. It's what stops the next
session from helpfully undoing it.

## Then stop

Push the branch, open the PR, **report the URL, and stop.** Never merge, never self-approve, never
force-push a reviewed branch. Never apply a migration, deploy a function, or change the cron
schedule — those are human-run, every time.

If part of the scope turned out to be blocked, say so in the PR body rather than quietly dropping
it.
