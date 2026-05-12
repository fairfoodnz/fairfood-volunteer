# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Commands

- `npm run dev` — Next.js dev server on http://localhost:3000.
- `npm run build` — production build (`output: "standalone"`).
- `npm start` — run the built server.
- `npm run lint` — ESLint via flat config (`eslint.config.mjs`); there is no separate `typecheck` script — rely on `next build` for full TS checking.
- `docker compose up -d db` — starts the Postgres 17 dev DB on **localhost:5434** (DB `fairfood`, user/pass `postgres`).
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
- **Path alias**: `@/*` → `src/*`.

## Deployment

- **Coolify + Garage S3**, **not Vercel**. Do not introduce Vercel-only APIs (Vercel Blob, Edge Config, AI Gateway provisioning, etc.). For object storage use `@aws-sdk/client-s3` with `forcePathStyle: true` against Garage.
- The `Dockerfile` is multi-stage: it ships the Next.js standalone bundle plus an **isolated `/opt/migrator` install** of `prisma`, `@prisma/client`, `@prisma/adapter-pg`, `dotenv`, and `tsx` so the container can run `prisma migrate deploy` (and `prisma db seed`) at startup without polluting the standalone `node_modules`. **Versions in that `RUN npm install` line must stay in lockstep with `package.json`** — bump together or `migrate deploy` will use a different Prisma version than the runtime client.
- Required env vars (see `.env.example`): `DATABASE_URL`, `AUTH_SECRET`, `NEXT_PUBLIC_APP_URL`.

## Working in this repo

- For any frontend work (components in `src/components/**`, pages in `src/app/**`, styling, layout, or interaction changes), load the `frontend-design:frontend-design` and `ui-ux-pro-max:ui-ux-pro-max` skills before editing — they shape the design quality this project expects.
- **Te reo Māori is for volunteer-facing surfaces only.** Admin/coordinator pages (anything under `/admin`, plus `src/components/admin/**` and `design-system/pages/admin-*.md`) stay in plain English — no Māori headings, labels, empty-state copy, or sprinkle words. The design-system master file's "te reo sprinkles" guidance applies to public/volunteer pages only.
