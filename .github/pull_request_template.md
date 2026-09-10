## What changed

<!-- One or two sentences. What does this do? -->

## Why

<!-- Link the issue: Closes #<n> -->

Ticket:

## How it was tested

<!-- Name the tests. For a bug fix, name the test that fails without the fix.
     If you verified something by hand (an SMS actually arriving, say), say so explicitly. -->

## Risk & rollback

<!-- Does this touch SMS sending (spends money)? A migration (touches data)? The webhook
     (security)? State the blast radius and how to undo it.
     "None — pure logic, covered by tests" is a fine answer when it's true. -->

---

## Definition of done

<!-- Tick only what is genuinely true. Mark anything that doesn't apply as n/a with a reason.
     An honest unticked box is useful; a dishonest tick makes the whole checklist worthless. -->

- [ ] Linked to a GitHub issue (`Closes #<n>` above)
- [ ] `lint`, `typecheck`, `test`, `check:edge` and `build` all pass locally
- [ ] New or changed pure logic has a test; a bug fix has a test that fails without the fix
- [ ] No new secrets, keys or project refs in the diff
- [ ] Any migration is **additive** — or destructive and explicitly approved by a human
- [ ] Any change to an SMS-sending path states its **cost impact** above
- [ ] Docs updated if behaviour changed (`architecture.md` / `runbook.md` / `decisions.md`)
- [ ] Deliberate decisions recorded in `docs/decisions.md`

<!-- Reminder: do not merge or self-approve. Migrations, function deploys and cron changes
     are human-run. See docs/workflow/definition-of-done.md -->
