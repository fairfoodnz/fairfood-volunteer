# Fair Food Volunteer

Volunteer management for [Fair Food](https://volunteer.fairfood.org.nz) — programmes, shifts, and bookings.

Built with Next.js 16 (App Router) + React 19, Prisma 7 over Postgres, Tailwind CSS v4 with shadcn/ui, and a custom magic-link auth flow. Deployed on Coolify with Garage S3 for object storage (not Vercel).

## Getting started

Start the local Postgres and S3 services, then the dev server:

```bash
docker compose up -d db        # Postgres 17 on localhost:5434
docker compose up -d garage    # Garage S3 on localhost:3900
./scripts/garage-init.sh       # first run only — prints the S3_* env vars

cp .env.example .env           # then fill in the values below
npm install
npx prisma migrate dev
npx prisma db seed

npm run dev                    # http://localhost:3000
```

In dev there is no mailer wired up — the magic-link sign-in URL is printed to the server console.

### Environment

See `.env.example`. Required: `DATABASE_URL`, `AUTH_SECRET`, `NEXT_PUBLIC_APP_URL` (production: `https://volunteer.fairfood.org.nz`). The `S3_*` vars are emitted by `./scripts/garage-init.sh` for local use.

## Commands

| Command | Description |
| --- | --- |
| `npm run dev` | Next.js dev server on port 3000 |
| `npm run build` | Production build (`output: "standalone"`) |
| `npm start` | Run the built server |
| `npm run lint` | ESLint (flat config). Full type checking is via `npm run build` |
| `npm run email:dev` | react-email preview on port 3001 (`emails/`) |
| `npx prisma migrate dev` | Apply migrations locally |
| `npx prisma db seed` | Seed the database (`prisma/seed.ts`) |

No test framework is configured.

## Architecture

See [CLAUDE.md](./CLAUDE.md) and [AGENTS.md](./AGENTS.md) for the full architecture notes and house rules. Highlights:

- **Next.js 16 App Router** — conventions differ from older Next.js; consult `node_modules/next/dist/docs/` before writing routing/caching code.
- **Prisma 7.8** over Postgres via the `@prisma/adapter-pg` driver adapter. Import the generated client from `@/generated/prisma`, never `@prisma/client`.
- **Custom magic-link auth** (`src/lib/auth.ts`) — guard server work with `requireUser()` / `requireAdmin()`.
- **Mutations are Server Actions** validated with Zod, followed by `revalidatePath`.
- **Te reo Māori is for volunteer-facing surfaces only.** Admin/coordinator pages stay in plain English.

## Code review

Pull requests are reviewed automatically by [Claude Code](https://www.anthropic.com/claude-code) via `.github/workflows/claude-code-review.yaml`. The workflow runs on every non-draft PR and posts inline review comments scoped to this project's rules (Prisma imports, auth guards, Next 16 patterns, the te reo / admin-English split, and more).

It authenticates with a Claude subscription OAuth token. To (re)configure:

1. Generate a token: `claude setup-token` (requires an active Claude Pro/Max subscription).
2. Add it as a repository secret named `CLAUDE_CODE_OAUTH_TOKEN`.
3. Optionally install the [Claude GitHub App](https://github.com/apps/claude) for cleaner comment attribution.

The review never blocks merging — it only comments. Tune its behaviour by editing the prompt in the workflow file or the guidance in `CLAUDE.md`.

## Deployment

Deployed via Coolify using the multi-stage `Dockerfile`, which ships the Next.js standalone bundle plus an isolated migrator install so the container runs `prisma migrate deploy` at startup. Object storage is Garage S3 (`@aws-sdk/client-s3` with `forcePathStyle: true`). Do not introduce Vercel-only APIs.
