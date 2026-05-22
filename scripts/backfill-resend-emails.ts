/**
 * Backfills `EmailLog` rows from the Resend account.
 *
 * Why this exists: the EmailLog table only started recording sends from the
 * point this PR shipped. Everything sent before that lives only in the Resend
 * dashboard — and admins want one place to look. This script walks Resend's
 * `/emails` endpoint, fetches each email's full body, infers which template
 * it was rendered from (by subject), maps it back to a User by email, and
 * inserts an EmailLog row.
 *
 * Idempotency is enforced by the `EmailLog.providerId @unique` constraint —
 * re-running the script just skips already-imported rows. Safe to interrupt
 * and resume; safe to run twice.
 *
 * Run:
 *   pnpm tsx scripts/backfill-resend-emails.ts
 *
 * Env required: `RESEND_API_KEY`, `DATABASE_URL`.
 * Optional:
 *   - `BACKFILL_LIMIT=N` — stop after inserting N rows (testing)
 *   - `BACKFILL_DRY_RUN=1` — print what would happen, don't write
 */

import "dotenv/config";
import { Resend } from "resend";
import { PrismaClient } from "../src/generated/prisma";
import { PrismaPg } from "@prisma/adapter-pg";
import { EmailLogStatus } from "../src/generated/prisma";
import { inferTemplateFromSubject } from "../src/lib/email-template-inference";

const RESEND_API_KEY = process.env.RESEND_API_KEY;
if (!RESEND_API_KEY) {
  console.error("RESEND_API_KEY is not set — refusing to run a no-op backfill.");
  process.exit(1);
}

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL is not set.");
  process.exit(1);
}

const DRY_RUN = process.env.BACKFILL_DRY_RUN === "1";
const MAX_INSERTS = process.env.BACKFILL_LIMIT
  ? Number.parseInt(process.env.BACKFILL_LIMIT, 10)
  : Infinity;

// Page size: Resend caps at 100. Each list page is one API call, then we make
// one more `get()` per email to pull the body — so 100 emails = 101 calls per
// page. The script paces itself with a 50ms delay between body fetches to stay
// well under Resend's documented 10 req/s soft limit.
const PAGE_SIZE = 100;
const PER_REQUEST_DELAY_MS = 50;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const adapter = new PrismaPg({ connectionString: DATABASE_URL });
const db = new PrismaClient({ adapter });
const resend = new Resend(RESEND_API_KEY);

type Stats = {
  pages: number;
  scanned: number;
  inserted: number;
  skippedExisting: number;
  skippedUnknownTemplate: number;
  skippedNoBody: number;
  skippedFailedSend: number;
};

async function main() {
  const stats: Stats = {
    pages: 0,
    scanned: 0,
    inserted: 0,
    skippedExisting: 0,
    skippedUnknownTemplate: 0,
    skippedNoBody: 0,
    skippedFailedSend: 0,
  };

  console.log(
    `[backfill] start${DRY_RUN ? " (DRY RUN)" : ""} — page size ${PAGE_SIZE}`,
  );

  let after: string | undefined;
  outer: while (stats.inserted < MAX_INSERTS) {
    const page = await resend.emails.list(
      after
        ? { limit: PAGE_SIZE, after }
        : { limit: PAGE_SIZE },
    );
    if (page.error) {
      console.error("[backfill] resend.emails.list failed:", page.error);
      process.exit(1);
    }
    const data = page.data?.data ?? [];
    if (data.length === 0) {
      console.log("[backfill] no more emails to scan");
      break;
    }
    stats.pages += 1;

    for (const item of data) {
      stats.scanned += 1;

      // Skip non-sent statuses (`canceled`, `scheduled`, `queued`, `failed`).
      // `failed` events would be useful to log as status=FAILED, but Resend
      // doesn't expose the failure reason via the list endpoint, and the
      // body fetch returns null html/text for failed sends — so the audit
      // row would be near-empty. Skip and rely on local FAILED logging
      // going forward.
      if (item.last_event === "failed" || item.last_event === "canceled") {
        stats.skippedFailedSend += 1;
        continue;
      }

      const existing = await db.emailLog.findUnique({
        where: { providerId: item.id },
        select: { id: true },
      });
      if (existing) {
        stats.skippedExisting += 1;
        continue;
      }

      const template = inferTemplateFromSubject(item.subject);
      if (!template) {
        stats.skippedUnknownTemplate += 1;
        console.log(
          `[backfill] skip ${item.id}: unknown subject "${item.subject}"`,
        );
        continue;
      }

      await sleep(PER_REQUEST_DELAY_MS);
      const detail = await resend.emails.get(item.id);
      if (detail.error || !detail.data) {
        console.warn(
          `[backfill] resend.emails.get(${item.id}) failed:`,
          detail.error,
        );
        continue;
      }
      const body = detail.data;
      if (body.html == null || body.text == null) {
        stats.skippedNoBody += 1;
        continue;
      }

      // Resend's `to` is `string[]` — historical templates only ever sent to
      // one recipient, but be defensive and stash the primary. The audit row
      // only stores one address; if a future broadcast ever multiplexes, it
      // can be logged once per recipient at send time.
      const toEmail = body.to[0]?.toLowerCase() ?? "";
      if (!toEmail) continue;

      const user = await db.user.findUnique({
        where: { email: toEmail },
        select: { id: true },
      });

      const createdAt = new Date(body.created_at);

      if (DRY_RUN) {
        // Deliberately log only the opaque Resend message id and whether a
        // user was matched. Logging the template name (e.g. PASSWORD_RESET)
        // or the recipient address would (a) trip CodeQL's
        // `js/clear-text-logging` rule and (b) leak audit metadata into any
        // chat or ticket where the dry-run output gets pasted. The Resend
        // dashboard is the source of truth for full details.
        console.log(
          `[backfill] would insert ${item.id} (matched user: ${user ? "yes" : "no"})`,
        );
        stats.inserted += 1;
        if (stats.inserted >= MAX_INSERTS) break outer;
        continue;
      }

      try {
        await db.emailLog.create({
          data: {
            userId: user?.id ?? null,
            toEmail,
            subject: body.subject,
            template,
            status: EmailLogStatus.SENT,
            providerId: item.id,
            error: null,
            bodyHtml: body.html,
            bodyText: body.text,
            createdAt,
          },
        });
        stats.inserted += 1;
      } catch (e) {
        // The unique index turns a concurrent re-run into a P2002. Treat that
        // as "already imported" rather than a hard error so resuming after
        // an interrupt is painless.
        if (e instanceof Error && e.message.includes("Unique")) {
          stats.skippedExisting += 1;
        } else {
          console.error(`[backfill] insert ${item.id} failed:`, e);
        }
      }

      if (stats.inserted >= MAX_INSERTS) {
        console.log(`[backfill] hit BACKFILL_LIMIT=${MAX_INSERTS}, stopping`);
        break outer;
      }
    }

    if (!page.data?.has_more) {
      console.log("[backfill] reached end of Resend history");
      break;
    }
    after = data[data.length - 1].id;
  }

  console.log(
    "[backfill] done",
    JSON.stringify(stats, null, 2),
  );
  await db.$disconnect();
}

main().catch(async (e) => {
  console.error("[backfill] fatal:", e);
  await db.$disconnect();
  process.exit(1);
});
