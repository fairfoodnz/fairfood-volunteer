# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Session start — load these skills immediately

Before responding to anything in this repo, invoke the **Skill** tool for both of these (one tool call each, in parallel):

1. `frontend-design:frontend-design`
2. `ui-ux-pro-max:ui-ux-pro-max`

This is not conditional on the task — load them at the start of every session so design guidance is in context before you touch any component, page, layout, copy, or interaction. Do this once per session; do not re-invoke them on every turn.

## Commands

- `npm run dev` — Next.js dev server on http://localhost:3000.
- `npm run build` — production build (`output: "standalone"`).
- `npm start` — run the built server.
- `npm run lint` — ESLint via flat config (`eslint.config.mjs`); there is no separate `typecheck` script — rely on `next build` for full TS checking.
- `npm run email:dev` — react-email preview server on **http://localhost:3001** (templates in `emails/`).
- `docker compose up -d db` — starts the Postgres 17 dev DB on **localhost:5434** (DB `fairfood`, user/pass `postgres`).
- `docker compose up -d garage` — starts the local Garage S3 on **localhost:3900** (admin API on 3903). Config is `garage/garage.toml`. After first start run `./scripts/garage-init.sh` to assign the layout, create the `fairfood` bucket + access key, and print the `S3_*` env vars to drop into `.env`. Script is idempotent — safe to re-run.
- `npx prisma migrate dev` / `npx prisma migrate deploy` / `npx prisma db seed` — migrations and seeding. Seed is `tsx prisma/seed.ts` (configured in `prisma.config.ts`, not `package.json`).
- No test framework is configured.

## Architecture

- **Next.js 16 App Router + React 19** with `output: "standalone"`. AGENTS.md is not decorative — this is Next 16, APIs and conventions differ from older Next.js. Consult `node_modules/next/dist/docs/` before writing routing, caching, or data-fetching code.
- **Prisma 7.8 over Postgres** via the `@prisma/adapter-pg` driver adapter (Prisma 7 requires an explicit adapter). The generated client lives at `src/generated/prisma` (custom `output` in `schema.prisma`) — **always import from `@/generated/prisma`**, never `@prisma/client`. The singleton lives in `src/lib/db.ts`.
- **Domain model** (`prisma/schema.prisma`): `Program` (one of five `ProgramSlug` enums) → many `Shift` → many `Booking` → `User`. `Booking` has a `@@unique([userId, shiftId])` constraint — catch the resulting Prisma "Unique" error string to surface "already booked" rather than relying on a pre-check. Times are stored as UTC `DateTime`; display formatting forces `Pacific/Auckland` (see `src/lib/programs.ts`).
- **Auth is custom magic-link**, not NextAuth/Clerk. `src/lib/auth.ts` owns the flow: `startSignIn` upserts a user + `LoginToken`, `verifyLoginToken` creates a `Session` row and sets the `ff_session` httpOnly cookie (30 days). In dev, the magic link is `console.log`'d — there's no mailer wired up. Guard server work with `requireUser()` / `requireAdmin()`, which `redirect()` rather than return errors.
- **Mutations are Server Actions**, validated with Zod. See `src/app/shifts/actions.ts` (booking, with anonymous booking-then-magic-link path), `src/app/admin/actions.ts`, and `src/app/auth/actions.ts`. After mutations they `revalidatePath` the affected routes.
- **Routes**: `/` marketing home, `/programs/[slug]`, `/shifts` + `/shifts/[id]`, `/me` + `/me/profile`, `/admin` + `/admin/shifts/[id]`, `/auth/sign-in` + `/auth/verify`. The `ProgramSlug` enum ⇄ URL path mapping is centralized in `src/lib/programs.ts` (`SLUG_TO_PATH`) — update both directions there, not ad hoc.
- **UI stack**: Tailwind CSS v4 (config-in-CSS, see `src/app/globals.css`), shadcn/ui with the `base-nova` style (`components.json`), Base UI (`@base-ui/react`) primitives, `lucide-react` icons, `sonner` toasts (mounted globally in `src/app/layout.tsx`), Poppins font via `next/font`. `cn()` is in `src/lib/utils.ts`. Marketing components in `src/components/site/`, primitives in `src/components/ui/`.
- **Transactional email** uses **react-email** (`emails/*.tsx`) rendered and sent via **Resend**. `src/lib/email.tsx` is the mailer: `sendEmail({ to, subject, react })` renders the template to HTML + plain text with `@react-email/render` and sends through Resend; `sendPasswordResetEmail()` wraps the `forgot-password` template. It's wired into the password-reset Server Actions in `src/app/auth/actions.ts` (`requestPasswordResetAction` / `resetPasswordAction`): single-use, SHA-256-**hashed** `PasswordResetToken`s (24h TTL, never stored raw), all sessions revoked on reset, and an identical response whether or not the account exists (no enumeration). **Dev needs no key — with `RESEND_API_KEY` unset the rendered text body is `console.log`'d instead of sent; in production an unset key throws** (a silently dropped reset email is worse than a loud failure). `EMAIL_FROM` must be an address on a Resend-verified domain (`Fair Food NZ <noreply@fairfood.org.nz>`). The brand palette is the `globals.css` OKLCH tokens hand-converted to email-safe hex in `emails/brand.ts` (email clients support neither OKLCH nor CSS variables — keep this in lockstep with `globals.css`). Social icons are self-hosted PNGs in `public/email/` referenced as **absolute** URLs via `NEXT_PUBLIC_APP_URL` (mail clients can't load relative paths). Preview with `npm run email:dev`.
- **Path alias**: `@/*` → `src/*`.

## Deployment

- **Coolify + Garage S3**, **not Vercel**. Do not introduce Vercel-only APIs (Vercel Blob, Edge Config, AI Gateway provisioning, etc.). For object storage use `@aws-sdk/client-s3` with `forcePathStyle: true` against Garage.
- The `Dockerfile` is multi-stage: it ships the Next.js standalone bundle plus an **isolated `/opt/migrator` install** of `prisma`, `@prisma/client`, `@prisma/adapter-pg`, `dotenv`, and `tsx` so the container can run `prisma migrate deploy` (and `prisma db seed`) at startup without polluting the standalone `node_modules`. **Versions in that `RUN npm install` line must stay in lockstep with `package.json`** — bump together or `migrate deploy` will use a different Prisma version than the runtime client.
- Required env vars (see `.env.example`): `DATABASE_URL`, `AUTH_SECRET`, `NEXT_PUBLIC_APP_URL` (production: `https://volunteer.fairfood.org.nz`). Email: `RESEND_API_KEY` (optional in dev — sends are logged to the console; **required in production** or sends throw) and `EMAIL_FROM` (an address on a Resend-verified domain).

## Working in this repo

- Design skills are loaded at session start (see top of this file); honour the guidance they ship from when editing anything under `src/components/**` or `src/app/**`.
- **Te reo Māori is for volunteer-facing surfaces only.** Admin/coordinator pages (anything under `/admin`, plus `src/components/admin/**` and `design-system/pages/admin-*.md`) stay in plain English — no Māori headings, labels, empty-state copy, or sprinkle words. The design-system master file's "te reo sprinkles" guidance applies to public/volunteer pages only.
