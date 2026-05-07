# syntax=docker/dockerfile:1.7

# ---- deps: install full dependencies (prisma CLI is a devDep, needed for `prisma generate`)
FROM node:24-alpine AS deps
WORKDIR /app
RUN apk add --no-cache libc6-compat
COPY package.json package-lock.json ./
RUN npm ci

# ---- builder: generate prisma client + build Next.js standalone bundle
FROM node:24-alpine AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN npm run build

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
      dotenv@17.4.2 tsx@4.21.0 \
 && chown -R nextjs:nodejs /opt/migrator

# Standalone bundle (includes its own minimal node_modules traced by NFT)
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

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

CMD ["sh", "-c", "NODE_PATH=/opt/migrator/node_modules /opt/migrator/node_modules/.bin/prisma migrate deploy && node server.js"]
