# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Session start — load these skills immediately

Before responding to anything in this repo, invoke the **Skill** tool for both of these (one tool call each, in parallel):

1. `frontend-design:frontend-design`
2. `ui-ux-pro-max:ui-ux-pro-max`

This is not conditional on the task — load them at the start of every session so design guidance is in context before you touch any component, page, layout, copy, or interaction. Do this once per session; do not re-invoke them on every turn.

## Commands

**Package manager is pnpm** — pinned via `packageManager` in `package.json`. Layout settings live in `pnpm-workspace.yaml`: `nodeLinker: hoisted` + `shamefullyHoist: true` so `node_modules` behaves like npm's. Next.js standalone tracing and a few phantom-dep imports rely on that flat layout — Prisma's generated client pulls `@prisma/client-runtime-utils` without declaring it, and `src/lib/email.tsx` imports `@react-email/render` (a transitive of `@react-email/components`). Run `corepack enable` once and Corepack activates the pinned pnpm automatically.

- `pnpm dev` — Next.js dev server on http://localhost:3000.
- `pnpm build` — production build (`output: "standalone"`).
- `pnpm start` — run the built server.
- `pnpm lint` — ESLint via flat config (`eslint.config.mjs`); there is no separate `typecheck` script — rely on `next build` for full TS checking.
- `pnpm email:dev` — react-email preview server on **http://localhost:3001** (templates in `emails/`).
- `docker compose up -d db` — starts the Postgres 17 dev DB on **localhost:5434** (DB `fairfood`, user/pass `postgres`).
- `docker compose up -d garage` — starts the local Garage S3 on **localhost:3900** (admin API on 3903). Config is `garage/garage.toml`. After first start run `./scripts/garage-init.sh` to assign the layout, create the `fairfood` bucket + access key, and print the `S3_*` env vars to drop into `.env`. Script is idempotent — safe to re-run.
- `pnpm exec prisma migrate dev` / `pnpm exec prisma migrate deploy` / `pnpm exec prisma db seed` — migrations and seeding. Seed entry is `tsx prisma/seed.ts` (configured in `prisma.config.ts`, not `package.json`), which is a thin **dispatcher**: under `NODE_ENV=production` it routes to `prisma/seed.prod.ts` (idempotent — upserts the three programmes and ensures the bootstrap `admin@fairfood.org.nz` user, default password `admin123` — change immediately); otherwise it routes to `prisma/seed.dev.ts` (the destructive demo seed — wipes all bookings/shifts/templates and all `*@seed.fairfood.test` users, then rebuilds rich demo data). The split exists so the dev wipe **cannot** run in prod by accident. The Dockerfile CMD runs the prod path on every container boot, right after `migrate deploy`.
- `pnpm test` / `pnpm test:unit` — Vitest unit tests (`tests/unit/`, pure `src/lib` logic; `pnpm test:watch` for watch mode). **`pnpm test` is unit-only by design** — it needs no server.
- `pnpm test:e2e` — Playwright e2e (`tests/e2e/`). Needs the seeded dev DB up; runs its own server (set `PORT=` to avoid a busy 3000). CI runs both in the `unit` and `e2e` jobs.

## Architecture

- **Next.js 16 App Router + React 19** with `output: "standalone"`. AGENTS.md is not decorative — this is Next 16, APIs and conventions differ from older Next.js. Consult `node_modules/next/dist/docs/` before writing routing, caching, or data-fetching code.
- **Prisma 7.8 over Postgres** via the `@prisma/adapter-pg` driver adapter (Prisma 7 requires an explicit adapter). The generated client lives at `src/generated/prisma` (custom `output` in `schema.prisma`) — **always import from `@/generated/prisma`**, never `@prisma/client`. The singleton lives in `src/lib/db.ts`.
- **Domain model** (`prisma/schema.prisma`): `Program` → many `Shift` → many `Booking` → `User`. `Program.slug` is a free-form unique `String` (coordinators add their own programmes — it's no longer a Prisma enum). `Booking` has a `@@unique([userId, shiftId])` constraint — catch the resulting Prisma "Unique" error string to surface "already booked" rather than relying on a pre-check. Times are stored as UTC `DateTime`; display formatting forces `Pacific/Auckland` (see `src/lib/programs.ts`).
- **Auth is custom**, not NextAuth/Clerk. `src/lib/auth.ts` owns the core: `hashPassword`/`verifyPassword` (bcrypt) and `createSession()`, which creates a `Session` row and sets the `ff_session` httpOnly cookie (30 days). Guard server work with `requireUser()` / `requireAdmin()`, which `redirect()` rather than return errors.
- **Google sign-in + passkeys** sit alongside the password flow and all terminate in the same `createSession()`. `src/lib/oauth.ts` wraps **arctic**'s Google client (auth-code + PKCE; state/PKCE/`next` ride in short-lived httpOnly cookies); the `GET /auth/google` + `GET /auth/google/callback` route handlers find by the stable Google `sub` (`OAuthAccount`), else **auto-link to an existing account only when Google reports the email verified**, else create a passwordless `User` (`passwordHash` is now nullable — see schema). If a session already exists the callback treats it as "connect", not login. `src/lib/webauthn.ts` wraps **@simplewebauthn** (rpID/origin derived from `NEXT_PUBLIC_APP_URL`, single-use challenge in an httpOnly cookie); passkeys are **discoverable/resident** so `/auth/sign-in` offers usernameless login (`src/app/auth/passkey/actions.ts`). `/me/security` (volunteer-facing) manages passkeys + the Google link, with a server-side guard that refuses to remove the last remaining sign-in method. Passkey login/register actions return a result for the client to act on; they don't `redirect()`. `signInAction` coalesces a null `passwordHash` to a dummy bcrypt hash so password login on a Google-/passkey-only account fails generically and in constant time. **Google is optional in dev** (`GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` unset → the button is hidden); passkeys need no config (localhost is a WebAuthn-secure context). `safeNextPath` / `postAuthDestination` in `src/lib/auth.ts` are the shared, single-source redirect rules every entry point uses.
- **Mutations are Server Actions**, validated with Zod. See `src/app/shifts/actions.ts` (booking — an unauthenticated attempt `redirect()`s to `/auth/sign-up?next=…`, then gates on profile completion and email verification), `src/app/admin/actions.ts`, and `src/app/auth/actions.ts`. After mutations they `revalidatePath` the affected routes.
- **Routes**: `/` marketing home, `/programs` + `/programs/[slug]`, `/shifts` + `/shifts/[id]`, `/me` (+ `/me/profile`, `/me/profile/complete`, `/me/security`), `/admin` (+ `/admin/shifts/[id]`, `/admin/programmes`, `/admin/volunteers`, `/admin/documents`, …), and the `/auth/*` pages: `sign-in`, `sign-up`, `verify-email`, `forgot-password`, `reset-password` (plus the `google` / `google/callback` route handlers). Programme URLs are built by `programHref(slug)` → `/programs/${slug}` in `src/lib/programs.ts`, and `slugify()` there derives a URL-safe slug from a free-form title — there's no enum or mapping table to keep in sync.
- **UI stack**: Tailwind CSS v4 (config-in-CSS, see `src/app/globals.css`), shadcn/ui with the `base-nova` style (`components.json`), Base UI (`@base-ui/react`) primitives, `lucide-react` icons, `sonner` toasts (mounted globally in `src/app/layout.tsx`), Poppins font via `next/font`. `cn()` is in `src/lib/utils.ts`. Marketing components in `src/components/site/`, primitives in `src/components/ui/`.
- **Transactional email** uses **react-email** (`emails/*.tsx`) rendered and sent via **Resend**. `src/lib/email.tsx` is the mailer: `sendEmail({ to, subject, react })` renders the template to HTML + plain text with `@react-email/render` and sends through Resend; `sendPasswordResetEmail()` wraps the `forgot-password` template. It's wired into the password-reset Server Actions in `src/app/auth/actions.ts` (`requestPasswordResetAction` / `resetPasswordAction`): single-use, SHA-256-**hashed** `PasswordResetToken`s (24h TTL, never stored raw), all sessions revoked on reset, and an identical response whether or not the account exists (no enumeration). A successful reset also sets `User.emailVerifiedAt` if unset (receiving the reset email proves inbox control). **Email verification** mirrors this exactly: `sendVerificationEmail()` + `EmailVerificationToken` (same hashed/single-use/24h model), issued in `signUpAction`, resent via `resendVerificationAction`. It's a **soft gate** — sign-up still creates a session, but a null `User.emailVerifiedAt` blocks `bookShiftAction` and shows `VerifyEmailBanner` on `/me`; existing accounts were grandfathered (backfilled to `createdAt`) in the `20260517040000_email_verification` migration. `verifyEmailAction` is POST-only (the `/auth/verify-email` page submits a button — never verify on GET; link-scanning mail filters pre-fetch and would burn the token). First successful verification fires `sendWelcomeEmail()` (`emails/welcome.tsx`). **Dev needs no key — with `RESEND_API_KEY` unset the rendered text body is `console.log`'d instead of sent; in production an unset key throws** (a silently dropped reset email is worse than a loud failure). `EMAIL_FROM` must be an address on a Resend-verified domain (`Fair Food <volunteering@fairfood.org.nz>`). The brand palette is the `globals.css` OKLCH tokens hand-converted to email-safe hex in `emails/brand.ts` (email clients support neither OKLCH nor CSS variables — keep this in lockstep with `globals.css`). Social icons are self-hosted PNGs in `public/email/` referenced as **absolute** URLs via `NEXT_PUBLIC_APP_URL` (mail clients can't load relative paths). Preview with `pnpm email:dev`.
- **Path alias**: `@/*` → `src/*`.

## Scheduled jobs

- **Booking reminders** (`POST /api/cron/booking-reminders`) — sends the
  `BOOKING_REMINDER` email to every volunteer whose **next NZ calendar day**
  holds a `CONFIRMED` booking on a non-cancelled shift, once per day. The
  selection window is computed DST-aware in `nzTomorrowUtcRange`. Idempotency
  lives on `Booking.reminderSentAt`: the route claims each row with an
  `updateMany({ where: { reminderSentAt: null } })` before sending, so two
  cron invocations (or a manual + scheduled hit) cannot double-send. A failed
  Resend send rolls the stamp back so the next tick retries. Pass `?force=1`
  to re-run for an already-stamped window (e.g. recovering from a Resend
  outage); without it stamped rows are skipped.
- **Trigger**: external — Coolify Scheduled Tasks (or any cron service) hits
  the endpoint with `Authorization: Bearer ${CRON_SECRET}`. Recommended
  schedule is **once a day around 10am NZ** (cron `0 10 * * *` with timezone
  `Pacific/Auckland`, or `0 22 * * *` UTC during NZDT / `0 21 * * *` UTC
  during NZST if your scheduler is UTC-only — the route doesn't care what
  time of day it fires, only which NZ calendar day "tomorrow" resolves to).
  Example command:
  ```bash
  curl -fsS -X POST -H "Authorization: Bearer $CRON_SECRET" \
    https://volunteer.fairfood.org.nz/api/cron/booking-reminders
  ```
  With `CRON_SECRET` unset on the app, every request is rejected — there's no
  open-by-default mode. The route is `POST`-only on purpose: a GET would let
  link prefetchers or mail scanners trigger sends.

## Deployment

- **Coolify + Garage S3**, **not Vercel**. Do not introduce Vercel-only APIs (Vercel Blob, Edge Config, AI Gateway provisioning, etc.). For object storage use `@aws-sdk/client-s3` with `forcePathStyle: true` against Garage.
- The `Dockerfile` is multi-stage: it ships the Next.js standalone bundle plus an **isolated `/opt/migrator` install** of `prisma`, `@prisma/client`, `@prisma/adapter-pg`, `dotenv`, and `tsx` so the container can run `prisma migrate deploy` (and `prisma db seed`) at startup without polluting the standalone `node_modules`. The `deps`/`builder` stages use **pnpm via Corepack** (no global install — `corepack enable` reads `package.json`'s `packageManager` field), but the `/opt/migrator` install in the runner stage **deliberately stays on `npm install`** because it's a one-shot, throwaway, lockfile-less install of five pinned packages and we don't need pnpm there. **Versions in that `RUN npm install` line must stay in lockstep with `package.json`** — bump together or `migrate deploy` will use a different Prisma version than the runtime client.
- Required env vars (see `.env.example`): `DATABASE_URL`, `AUTH_SECRET`, `NEXT_PUBLIC_APP_URL` (production: `https://volunteer.fairfood.org.nz`). Email: `RESEND_API_KEY` (optional in dev — sends are logged to the console; **required in production** or sends throw) and `EMAIL_FROM` (an address on a Resend-verified domain). Google sign-in: `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` (optional in dev; the OAuth client's authorised redirect URI must be `<NEXT_PUBLIC_APP_URL>/auth/google/callback`). Passkeys derive their rpID/origin from `NEXT_PUBLIC_APP_URL` — no extra vars, but it must be the real public origin in production. PostHog analytics: `NEXT_PUBLIC_POSTHOG_KEY` / `NEXT_PUBLIC_POSTHOG_HOST` (optional in dev — an empty key means no events are sent; set the project key in production). **The `NEXT_PUBLIC_POSTHOG_*` vars are build-time-inlined exactly like `NEXT_PUBLIC_APP_URL` (the `Dockerfile` declares them as `ARG`s; in Coolify they must be *build arguments*, not runtime env vars, or analytics is silently dead in the bundle).** Scheduled jobs: `CRON_SECRET` is the shared bearer token for `/api/cron/booking-reminders` (see the Scheduled jobs section above) — required wherever the cron should actually run. **`NEXT_PUBLIC_APP_URL` is build-time-inlined by Next.js (server code included — OAuth redirect URI, WebAuthn rpID, email links), NOT read at runtime.** The `Dockerfile` sets it as an `ARG` defaulting to the production origin; a runtime/Coolify value is ignored, so for any non-prod image pass `--build-arg NEXT_PUBLIC_APP_URL=…` (Coolify: a *build argument*, not a runtime env var).

## Working in this repo

- Design skills are loaded at session start (see top of this file); honour the guidance they ship from when editing anything under `src/components/**` or `src/app/**`.
- **Te reo Māori is for volunteer-facing surfaces only.** Admin/coordinator pages (anything under `/admin`, plus `src/components/admin/**` and `design-system/pages/admin-*.md`) stay in plain English — no Māori headings, labels, empty-state copy, or sprinkle words. The design-system master file's "te reo sprinkles" guidance applies to public/volunteer pages only.
