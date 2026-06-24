# syntax=docker/dockerfile:1.7

# ---- deps: install full dependencies (prisma CLI is a devDep, needed for `prisma generate`)
FROM node:24-alpine AS deps
WORKDIR /app
RUN apk add --no-cache libc6-compat
# Corepack installs pnpm shims; the shims then read the exact pnpm version
# from package.json's `packageManager` field on first invocation. We can't
# `corepack prepare --activate` here because that command needs package.json
# in the CWD — and we want this RUN layer cached above the COPY.
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

# ---- builder: generate prisma client + build Next.js standalone bundle
FROM node:24-alpine AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
# Placeholder env vars so `next build` can import server modules that
# validate env at module-evaluation time (e.g. src/lib/s3.ts). DATABASE_URL,
# AUTH_SECRET and the S3_* values are read at *runtime* from the real
# environment, so these placeholders never reach the runner.
ENV DATABASE_URL=postgresql://build:build@localhost:5432/build?schema=public
ENV AUTH_SECRET=build-placeholder-not-used-at-runtime
# NEXT_PUBLIC_* is the exception: Next.js INLINES it into the bundle at build
# time (server code included — OAuth redirect URI, WebAuthn rpID/origin, email
# links), so a runtime/Coolify value is IGNORED. It must be correct *here*.
# Defaults to production; override per environment with
# `docker build --build-arg NEXT_PUBLIC_APP_URL=https://…` (in Coolify set it
# as a build argument, not just a runtime env var).
ARG NEXT_PUBLIC_APP_URL=https://volunteer.fairfood.org.nz
ENV NEXT_PUBLIC_APP_URL=${NEXT_PUBLIC_APP_URL}
# PostHog analytics — same NEXT_PUBLIC_* build-time-inlining rule as above.
# KEY has no safe default (analytics is silently disabled if unset at build);
# pass `--build-arg NEXT_PUBLIC_POSTHOG_KEY=phc_…` (Coolify: build argument).
ARG NEXT_PUBLIC_POSTHOG_KEY=
ENV NEXT_PUBLIC_POSTHOG_KEY=${NEXT_PUBLIC_POSTHOG_KEY}
ARG NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com
ENV NEXT_PUBLIC_POSTHOG_HOST=${NEXT_PUBLIC_POSTHOG_HOST}
ENV S3_ENDPOINT=http://localhost:3900
ENV S3_REGION=build
ENV S3_BUCKET=build
ENV S3_ACCESS_KEY_ID=build
ENV S3_SECRET_ACCESS_KEY=build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Corepack again so `pnpm` is on PATH for the build step (it ships with Node
# but needs activation per stage). package.json is now in CWD so the shim
# can pick up the pinned version from its `packageManager` field.
RUN corepack enable
RUN pnpm exec prisma generate
RUN pnpm run build

# ---- runner: minimal runtime image
FROM node:24-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# openssl is required by the prisma CLI's schema engine on alpine
RUN apk add --no-cache openssl \
 && addgroup -g 1001 -S nodejs \
 && adduser -S nextjs -u 1001

# Isolated install of the Prisma CLI (for `migrate deploy` and `db seed`)
# plus tsx (used by the seed script). Kept in /opt so it can't conflict
# with the standalone bundle's node_modules.
# Versions must match package.json — bump together.
RUN mkdir -p /opt/migrator \
 && cd /opt/migrator \
 && npm init -y >/dev/null \
 && npm install --omit=optional --no-package-lock --no-audit --no-fund \
      prisma@7.8.0 @prisma/client@7.8.0 @prisma/adapter-pg@7.8.0 \
      dotenv@17.4.2 tsx@4.22.1 \
 && chown -R nextjs:nodejs /opt/migrator

# Standalone bundle (includes its own minimal node_modules traced by NFT)
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# sharp ships its native code as two separate per-platform packages: the
# addon (@img/sharp-linuxmusl-x64, the .node) and the libvips shared libs it
# dlopen()s at runtime (@img/sharp-libvips-linuxmusl-x64, libvips-cpp.so).
# Next.js file tracing copies the addon but NOT the libvips .so it loads
# natively — NFT can't follow a dlopen — so `import sharp` throws
# ERR_DLOPEN_FAILED ("Could not load the sharp module … libvips-cpp.so … No
# such file or directory") the first time it runs. That import sits in the
# /admin programme image probe (src/lib/image-dimensions.ts), so the whole
# programme create/update Server Action fails to load. Overlay the complete
# sharp + @img trees from the builder onto NFT's partial copy — build and
# runner are both node:24-alpine (musl x64), so the binaries match exactly.
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/sharp ./node_modules/sharp
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/@img ./node_modules/@img

# Prisma schema + config — needed by `migrate deploy` at runtime.
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/prisma.config.ts ./prisma.config.ts

# Generated Prisma client — NFT only traces the files imported by app code,
# leaving package metadata behind that `prisma db seed` and tsx need to
# resolve `../src/generated/prisma` from prisma/seed.ts.
COPY --from=builder --chown=nextjs:nodejs /app/src/generated/prisma ./src/generated/prisma

# Put tsx on PATH so `prisma db seed` (which runs "tsx prisma/seed.ts") works.
ENV PATH="/opt/migrator/node_modules/.bin:$PATH"

USER nextjs
EXPOSE 3000

# Liveness probe Coolify can read. Uses node's built-in fetch (always present
# in the image — alpine has no curl, and this avoids busybox wget quirks).
# start-period covers `prisma migrate deploy` + Next.js boot before failures
# count against retries.
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

# `prisma db seed` runs prisma/seed.ts, which dispatches to seed.prod.ts under
# NODE_ENV=production (set above). The prod seed is upsert-only and idempotent,
# so re-running it on every boot just keeps editorial copy in sync and ensures
# the bootstrap admin exists.
CMD ["sh", "-c", "NODE_PATH=/opt/migrator/node_modules /opt/migrator/node_modules/.bin/prisma migrate deploy && NODE_PATH=/opt/migrator/node_modules /opt/migrator/node_modules/.bin/prisma db seed && node server.js"]
