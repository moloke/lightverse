# Versioning

`package.json`'s `version` field is the **single source of truth**. Nothing else stores a version
string: the site footer and the README both derive from it.

The version exists primarily **for users** — small print at the bottom of every page, saying the
product is alive and being worked on. That it also tells us what is live is secondary.

## The rules

Semantic versioning, with every ambiguity settled by one question:

> **Does a user gain a new capability?**

| Bump | When | Examples |
|---|---|---|
| **MAJOR** | A breaking change to the user-facing contract: the SMS reply protocol, review-ladder semantics, pricing, or a migration that changes the meaning of existing rows. | Replacing the crude ladder with real SM-2; changing what a user replies |
| **MINOR** | A new user-visible capability — a feature or a story. | The review engine; word-level feedback; the version footer itself |
| **PATCH** | Everything else: bug fixes, copy, refactors, docs, CI, infra, tests, dependency bumps. | Signature verification (#11); the streak fix (#12); the ESLint config (#10) |

**`1.0.0` is reserved for public launch — the first paying user.** Until then, minor bumps do the
work majors will do later. That is expected.

**A bug fix is always a patch, however severe.** #11 closed an open SMS relay and is still a patch:
the user gained nothing they did not already believe they had.

### Default mapping from commit types

The repo already uses conventional commits, so start here:

| Commit type | Bump |
|---|---|
| `feat` | minor |
| `fix` | patch |
| `chore` `docs` `refactor` `test` `ci` | patch |

**The user-visible test overrides the mapping.** A `feat` that ships no user-visible capability —
an internal extraction, a shared-core module nothing calls yet — is a **patch**.

**When genuinely torn, choose the smaller bump.** Under-claiming is recoverable; over-claiming
pollutes the history permanently and cannot be undone without lying about what shipped.

## What you do on every PR

1. Bump `version` in `package.json`.
2. Add a line to the README's **Version history** saying what changed, with the issue number.
3. `npm run check:version` — CI runs it too.

Two open PRs will conflict on `package.json`. That is expected and trivial to resolve; it is the
cost of a version that always means something.

## What `check:version` enforces

- The version is valid `MAJOR.MINOR.PATCH` — no `v` prefix, no pre-release suffix, no leading zeroes.
- It is **strictly greater** than the version on the base branch.
- The README's Version history mentions it.

It does **not** check that the *size* of the bump matches the commit types. That needs a reliable
merge-base across rebases and squashes, and a false failure would block every PR. Judgement stays
with the person writing the PR — see the `Out` section of issue #21.

On a push to the default branch, or in a clone too shallow to see the base, the "must increase"
rule is skipped and the script says so. Format and README checks always run.

## What is deliberately not automated

No `semantic-release`, no `standard-version`, no generated changelog. The readiness plan (§3.8)
excluded these as solo-developer overhead, and that still holds. The bump is a deliberate human
act, which is the point: it forces a moment of "what did this actually change for a user?"

Git tags and GitHub Releases are also not used. Worth revisiting if the version ever needs to
address a specific build.
