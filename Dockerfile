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

# Isolated install of the Prisma CLI for `migrate deploy` at startup.
# Kept in /opt so it can't conflict with the standalone bundle's node_modules.
# Versions must match package.json — bump together.
RUN mkdir -p /opt/migrator \
 && cd /opt/migrator \
 && npm init -y >/dev/null \
 && npm install --omit=optional --no-package-lock --no-audit --no-fund \
      prisma@7.8.0 dotenv@17.4.2 \
 && chown -R nextjs:nodejs /opt/migrator

# Standalone bundle (includes its own minimal node_modules traced by NFT)
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# Prisma schema + config — needed by `migrate deploy` at runtime.
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/prisma.config.ts ./prisma.config.ts

USER nextjs
EXPOSE 3000

CMD ["sh", "-c", "/opt/migrator/node_modules/.bin/prisma migrate deploy && node server.js"]
