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

The edge functions run on Deno, not Node, and are not exercised by `npm run dev`. Only `dev`,
`build`, `start` and `lint` exist as scripts today; the rest of the gate (`typecheck`, `test`,
`check:edge`) is [issue #10](https://github.com/moloke/lightverse/issues/10).

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
