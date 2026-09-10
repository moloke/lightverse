---
name: Ticket
about: A unit of work an agent or human can pick up and finish
title: ''
labels: needs-triage
---

**Type:** feat | fix | chore | refactor    **Priority:** P0 | P1 | P2
**Gap ref:** <e.g. S-1 / C-4, from docs/ai-readiness-plan.md — omit if not applicable>

## Context

Why this matters, in 2–4 sentences. Link the relevant part of `docs/product/v1-brief.md` if the
change is product-shaped.

## Scope

**In:** the specific change to make.
**Out:** what to explicitly NOT touch. *(This field is what bounds the agent — be concrete. "Don't
change the validation logic," "don't touch other functions," "no schema changes.")*

## Acceptance criteria

- [ ] Observable, checkable outcomes — not implementation steps.
- [ ] …

## Testing

Which tests must exist and pass. For a bug fix: name the test that fails before the fix and passes
after it.

## Risk & rollback

Does this touch SMS-sending code (spends money)? A migration (touches data)? The webhook
(security)? State the blast radius and how to undo it if it goes wrong. Write "none — pure logic,
covered by tests" if that's genuinely true.

## Notes

Files likely involved, known gotchas, and any relevant entry in `docs/decisions.md`.
