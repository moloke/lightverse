# Issue tracker: GitHub

Issues and specs for this repo live as **GitHub issues** on `moloke/lightverse`. They are the
single, authoritative work surface: there is no parallel in-repo ticket directory. Use the `gh`
CLI for all operations — it infers the repo from `git remote -v` inside a clone.

This supersedes the earlier `docs/tickets/` convention and readiness-plan §3.6. See the
`2026-09-10 · Tickets move to GitHub Issues` entry in [`../decisions.md`](../decisions.md).

## Conventions

- **Create an issue**: `gh issue create --title "..." --body "..."`. Use a heredoc for multi-line
  bodies. Every issue body follows the **required shape** below.
- **Read an issue**: `gh issue view <number> --comments`, filtering comments by `jq` and also
  fetching labels.
- **List issues**: `gh issue list --state open --json number,title,body,labels,comments --jq '[.[] | {number, title, body, labels: [.labels[].name], comments: [.comments[].body]}]'` with appropriate `--label` and `--state` filters.
- **Comment on an issue**: `gh issue comment <number> --body "..."`
- **Apply / remove labels**: `gh issue edit <number> --add-label "..."` / `--remove-label "..."`
- **Close**: `gh issue close <number> --comment "..."`

## The required issue body shape

Ported from the old `docs/tickets/TEMPLATE.md` and kept verbatim in
[`../../.github/ISSUE_TEMPLATE/ticket.md`](../../.github/ISSUE_TEMPLATE/ticket.md), which GitHub
offers on every new issue. An agent writing an issue fills the same sections:

```markdown
**Type:** feat | fix | chore | refactor    **Priority:** P0 | P1 | P2
**Gap ref:** <e.g. S-1 / C-4, from docs/ai-readiness-plan.md — omit if not applicable>

## Context
Why this matters, in 2–4 sentences. Link the relevant part of docs/product/v1-brief.md if the
change is product-shaped.

## Scope
**In:** the specific change to make.
**Out:** what to explicitly NOT touch.

## Acceptance criteria
- [ ] Observable, checkable outcomes — not implementation steps.

## Testing
Which tests must exist and pass. For a bug fix: the test that fails before the fix.

## Risk & rollback
Touches SMS sending (spends money)? A migration (touches data)? The webhook (security)? State the
blast radius and how to undo it.

## Notes
Files likely involved, gotchas, and any relevant entry in docs/decisions.md.
```

**`Out` and `Risk & rollback` are the two fields that do real work with an agent** — the first
bounds it, the second forces it to notice when it is near something expensive or irreversible. Do
not drop them to save space.

## Branches, commits and PRs

- The issue number **is** the ticket id: branch as `<type>/<issue-number>-<slug>`, e.g.
  `fix/12-twilio-signature-verification`. Types: `feat|fix|chore|docs|refactor|test|ci`.
- Reference the issue in the PR body (`Closes #12`) so it closes on merge.
- The rest of the MR procedure — the local gate, conventional commits, never merging your own PR —
  is in [`../../CLAUDE.md`](../../CLAUDE.md).

## Pull requests as a triage surface

**PRs as a request surface: no.** _(Set to `yes` if this repo treats external PRs as feature
requests; `/triage` reads this flag.)_

When set to `yes`, PRs run through the same labels and states as issues, using the `gh pr`
equivalents:

- **Read a PR**: `gh pr view <number> --comments` and `gh pr diff <number>` for the diff.
- **List external PRs for triage**: `gh pr list --state open --json number,title,body,labels,author,authorAssociation,comments` then keep only `authorAssociation` of `CONTRIBUTOR`, `FIRST_TIME_CONTRIBUTOR`, or `NONE` (drop `OWNER`/`MEMBER`/`COLLABORATOR`).
- **Comment / label / close**: `gh pr comment`, `gh pr edit --add-label`/`--remove-label`, `gh pr close`.

GitHub shares one number space across issues and PRs, so a bare `#42` may be either: resolve with
`gh pr view 42` and fall back to `gh issue view 42`.

## When a skill says "publish to the issue tracker"

Create a GitHub issue, using the body shape above.

## When a skill says "fetch the relevant ticket"

Run `gh issue view <number> --comments`.

## Wayfinding operations

Used by `/wayfinder`. The **map** is a single issue with **child** issues as tickets.

- **Map**: a single issue labelled `wayfinder:map`, holding the Notes / Decisions-so-far / Fog body. `gh issue create --label wayfinder:map`.
- **Child ticket**: an issue linked to the map as a GitHub sub-issue (`gh api` on the sub-issues endpoint). Where sub-issues aren't enabled, add the child to a task list in the map body and put `Part of #<map>` at the top of the child body. Labels: `wayfinder:<type>` (`research`/`prototype`/`grilling`/`task`). Once claimed, the ticket is assigned to the driving dev.
- **Blocking**: GitHub's **native issue dependencies**, the canonical, UI-visible representation. Add an edge with `gh api --method POST repos/<owner>/<repo>/issues/<child>/dependencies/blocked_by -F issue_id=<blocker-db-id>`, where `<blocker-db-id>` is the blocker's numeric **database id** (`gh api repos/<owner>/<repo>/issues/<n> --jq .id`, _not_ the `#number` or `node_id`). GitHub reports `issue_dependencies_summary.blocked_by` (open blockers only, the live gate). Where dependencies aren't available, fall back to a `Blocked by: #<n>, #<n>` line at the top of the child body. A ticket is unblocked when every blocker is closed.
- **Frontier query**: list the map's open children (`gh issue list --state open`, scoped to the map's sub-issues / task list), drop any with an open blocker (`issue_dependencies_summary.blocked_by > 0`, or an open issue in the `Blocked by` line) or an assignee; first in map order wins.
- **Claim**: `gh issue edit <n> --add-assignee @me`, the session's first write.
- **Resolve**: `gh issue comment <n> --body "<answer>"`, then `gh issue close <n>`, then append a context pointer (gist + link) to the map's Decisions-so-far.
