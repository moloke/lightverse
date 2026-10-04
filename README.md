# LightVerse

An SMS-native scripture-memorization service. It texts you a verse each morning with words
progressively blanked out, you reply to recall it, and spaced repetition brings older verses back
before you forget them. No app to download, no password, no page to remember to open.

**Next.js 15 + React 19 on Vercel · Supabase (Postgres, phone-OTP auth, Deno edge functions) ·
Twilio for SMS.**

## Running it locally

Requires Node **20.19.5** (pinned in `.nvmrc`) and a Supabase project plus a Twilio account.

```bash
nvm use                        # 20.19.5
npm install
cp .env.example .env           # then fill in your own values — never commit this file
npm run dev                    # http://localhost:3000
```

Database setup: run `supabase/migrations/*.sql` in order in the Supabase SQL Editor, then
`supabase/seed.sql` for 20 starter verses. There is no local Supabase config yet, so migrations
are applied by hand — see the runbook.

The edge functions run on Deno, not Node, and are not exercised by `npm run dev`. Running
`check:edge` locally needs Deno installed.

The full gate, which CI runs on every PR:

```bash
npm run lint && npm run typecheck && npm test && npm run check:edge && npm run build
npm run check:version          # every PR must bump the version
```

## Version history

The version shows in small print at the bottom of every page and lives in `package.json`. What each
bump means is in [`docs/workflow/versioning.md`](docs/workflow/versioning.md).

### 0.x — pre-launch

`1.0.0` is reserved for public launch. Until then, minor bumps carry features and patches carry
everything else.

- 0.2.1 — the SMS path uses the shared streak logic instead of its own drifted copy
  ([#30](https://github.com/moloke/lightverse/issues/30))
- **0.2.0** — version footer on every page, README version history, and a CI gate that fails a PR
  which does not bump the version ([#21](https://github.com/moloke/lightverse/issues/21))
  - *Everything before this point predates versioning and is recorded here for continuity:*
  - Web practice builds a streak again — it was writing to a column migration 009 dropped
    ([#12](https://github.com/moloke/lightverse/issues/12))
  - The inbound webhook verifies the Twilio request signature, closing an open SMS relay
    ([#11](https://github.com/moloke/lightverse/issues/11)), and verifies it against the public URL
    rather than `req.url` ([#25](https://github.com/moloke/lightverse/issues/25))
  - Deployed edge-function code committed, so `main` matches production
    ([#18](https://github.com/moloke/lightverse/issues/18))
  - ESLint, Vitest, typecheck and `check:edge` wired up — CI green for the first time
    ([#10](https://github.com/moloke/lightverse/issues/10))
- **0.1.0** — everything up to this point: SMS delivery, the cloze ladder, phone-OTP auth, the web
  practice flow

## Documentation

Start with **[CLAUDE.md](CLAUDE.md)** — the operating manual for this repo, human or agent.

| | |
|---|---|
| [docs/product/v1-brief.md](docs/product/v1-brief.md) | What we're building and why. Canonical — don't contradict it |
| [docs/architecture.md](docs/architecture.md) | Topology, the daily loop, the data model |
| [docs/runbook.md](docs/runbook.md) | Migrations, deploys, cron, secrets, what to check when SMS stops |
| [docs/decisions.md](docs/decisions.md) | Why things are the way they are. Read before "fixing" something odd |
| [docs/engineering/](docs/engineering/) | Testing, security, coding standards |
| [docs/workflow/definition-of-done.md](docs/workflow/definition-of-done.md) | What "done" means here |
| [GitHub Issues](https://github.com/moloke/lightverse/issues) | The unit of work |

## Two rules worth knowing before you touch anything

**Every code path in `supabase/functions/` can send a paid SMS.** Treat outbound messages as
spending real money, because they are.

**Migrations are forward-only and additive.** No `DROP TABLE`, `DROP COLUMN`, or `TRUNCATE` —
migration 009 destroyed every user's streak history, which is why this rule exists.
