import "server-only";

import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { db } from "@/lib/db";

// Attempt limits for the auth endpoints, so a script can't try passwords,
// burn reset tokens or fire emails as fast as the network allows. See
// fairfoodnz/fairfood-volunteer#48.
//
// Each scope counts per dimension in a fixed window: per email (or user) so
// one account can't be hammered from many addresses, and per client IP so one
// address can't sweep many accounts. Every configured dimension is counted on
// every attempt, and the attempt is blocked when any of them is over.
//
// Counters live in Postgres (`RateLimitBucket`) rather than process memory:
// a redeploy doesn't reset an attacker's allowance, and a second container
// would share the same counts. An email/user limit counts attempts whether or
// not the account exists, so being limited never reveals that it does.

const MINUTE = 60;
const HOUR = 60 * MINUTE;

type Rule = { limit: number; windowSeconds: number };
type Dimension = "email" | "user" | "ip";

export const RATE_LIMITS = {
  signIn: {
    email: { limit: 10, windowSeconds: 10 * MINUTE },
    ip: { limit: 30, windowSeconds: 10 * MINUTE },
  },
  passwordResetRequest: {
    email: { limit: 3, windowSeconds: HOUR },
    ip: { limit: 10, windowSeconds: HOUR },
  },
  // The token is 256 bits, so this guards the database, not the token.
  passwordResetConfirm: {
    ip: { limit: 20, windowSeconds: HOUR },
  },
  // Every sign-up sends a verification email. Generous enough for a workplace
  // or school signing up together from behind one address.
  signUp: {
    ip: { limit: 30, windowSeconds: HOUR },
  },
  // On top of the 60-second per-user cooldown in resendVerificationAction.
  resendVerification: {
    user: { limit: 5, windowSeconds: HOUR },
    ip: { limit: 20, windowSeconds: HOUR },
  },
  // Each passkey sign-in makes one begin and one finish call.
  passkeyBegin: {
    ip: { limit: 60, windowSeconds: 10 * MINUTE },
  },
  passkeyFinish: {
    ip: { limit: 30, windowSeconds: 10 * MINUTE },
  },
} as const satisfies Record<string, Partial<Record<Dimension, Rule>>>;

export type RateLimitScope = keyof typeof RATE_LIMITS;
type Identifiers<S extends RateLimitScope> = {
  [D in keyof (typeof RATE_LIMITS)[S]]: string | null | undefined;
};

export type RateLimitResult =
  | { ok: true }
  | { ok: false; retryAfterSeconds: number };

/**
 * Bucket key for one dimension. The identifier is normalised and hashed so the
 * table never holds a raw email address or IP, and so "A@x.nz " and "a@x.nz"
 * share a bucket.
 */
export function bucketKey(
  scope: RateLimitScope,
  dimension: Dimension,
  identifier: string,
): string {
  const normalised = identifier.trim().toLowerCase();
  const digest = createHash("sha256").update(normalised).digest("hex");
  return `${scope}:${dimension}:${digest}`;
}

/**
 * The client's IP as seen by the reverse proxy in front of the app (Coolify's
 * Traefik). The proxy appends the address it accepted the connection from to
 * `X-Forwarded-For`, so the right-most entry is the one the client can't
 * forge; anything to its left is client-supplied. With no proxy in front
 * (`next dev`, e2e) Next.js fills the header from the socket address itself.
 * Falls back to `X-Real-IP`, then null, in which case the IP dimension is
 * skipped rather than lumping every visitor into one bucket.
 */
export function clientIpFrom(get: (name: string) => string | null): string | null {
  const forwarded = get("x-forwarded-for");
  if (forwarded) {
    const hops = forwarded
      .split(",")
      .map((hop) => hop.trim())
      .filter(Boolean);
    const last = hops.at(-1);
    if (last) return last;
  }
  return get("x-real-ip")?.trim() || null;
}

async function clientIp(): Promise<string | null> {
  const h = await headers();
  return clientIpFrom((name) => h.get(name));
}

/**
 * Count one hit against a bucket and return the new count plus the seconds
 * left in its window. A single atomic upsert, so concurrent attempts can't
 * both read the old count. All time arithmetic happens in the database, in
 * UTC, to match how Prisma stores `DateTime` in `timestamp` columns.
 */
async function hit(
  key: string,
  rule: Rule,
): Promise<{ count: number; retryAfterSeconds: number }> {
  const [row] = await db.$queryRaw<{ count: number; retryAfter: number }[]>`
    INSERT INTO "RateLimitBucket" ("key", "count", "resetAt")
    VALUES (
      ${key},
      1,
      (now() AT TIME ZONE 'UTC') + make_interval(secs => ${rule.windowSeconds})
    )
    ON CONFLICT ("key") DO UPDATE SET
      "count" = CASE
        WHEN "RateLimitBucket"."resetAt" <= (now() AT TIME ZONE 'UTC') THEN 1
        ELSE "RateLimitBucket"."count" + 1
      END,
      "resetAt" = CASE
        WHEN "RateLimitBucket"."resetAt" <= (now() AT TIME ZONE 'UTC')
          THEN EXCLUDED."resetAt"
        ELSE "RateLimitBucket"."resetAt"
      END
    RETURNING
      "count",
      GREATEST(
        1,
        CEIL(EXTRACT(EPOCH FROM ("resetAt" - (now() AT TIME ZONE 'UTC'))))
      )::int AS "retryAfter"
  `;
  return { count: row.count, retryAfterSeconds: row.retryAfter };
}

/** Roughly one call in this many also sweeps out expired buckets. */
const PRUNE_ONE_IN = 50;

async function maybePrune(): Promise<void> {
  if (Math.random() * PRUNE_ONE_IN >= 1) return;
  await db.$executeRaw`
    DELETE FROM "RateLimitBucket"
    WHERE "resetAt" <= (now() AT TIME ZONE 'UTC')
  `;
}

/**
 * Count an attempt at `scope` against each identifier given (and the client
 * IP, where the scope limits by IP) and say whether it may proceed.
 *
 * Fails open: if the counters can't be reached the attempt is allowed and the
 * error logged, because locking every volunteer out of sign-in over a limiter
 * fault is worse than briefly running without one. The auth code that follows
 * needs the same database, so a real outage still stops it there.
 */
export async function rateLimit<S extends RateLimitScope>(
  scope: S,
  identifiers: Omit<Identifiers<S>, "ip">,
): Promise<RateLimitResult> {
  const rules = RATE_LIMITS[scope] as Partial<Record<Dimension, Rule>>;
  try {
    const ids: Partial<Record<Dimension, string | null | undefined>> = {
      ...(identifiers as Partial<Record<Dimension, string | null | undefined>>),
      ...("ip" in rules ? { ip: await clientIp() } : {}),
    };

    let retryAfterSeconds = 0;
    const exceeded: Dimension[] = [];
    for (const dimension of Object.keys(rules) as Dimension[]) {
      const identifier = ids[dimension];
      const rule = rules[dimension];
      if (!identifier || !rule) continue;
      const result = await hit(bucketKey(scope, dimension, identifier), rule);
      if (result.count > rule.limit) {
        exceeded.push(dimension);
        retryAfterSeconds = Math.max(retryAfterSeconds, result.retryAfterSeconds);
      }
    }

    await maybePrune().catch((err) => {
      console.error("[rate-limit] prune failed", err);
    });

    if (exceeded.length === 0) return { ok: true };
    // Audit trail for ops. Names only the scope and which limits tripped:
    // never the email or IP.
    console.warn(
      `[rate-limit] blocked ${scope} (${exceeded.join(", ")}); retry in ${retryAfterSeconds}s`,
    );
    return { ok: false, retryAfterSeconds };
  } catch (err) {
    console.error(`[rate-limit] ${scope} check failed; allowing`, err);
    return { ok: true };
  }
}

/** "a minute" / "5 minutes" / "an hour": how long until the limit lifts. */
export function retryAfterText(seconds: number): string {
  const minutes = Math.max(1, Math.ceil(seconds / MINUTE));
  if (minutes === 1) return "a minute";
  if (minutes === 60) return "an hour";
  return `${minutes} minutes`;
}
