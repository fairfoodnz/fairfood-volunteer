"use server";

import { createHash, randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { appOrigin, requireAdmin } from "@/lib/auth";
import { sendVolunteerInviteEmail } from "@/lib/email";
import {
  MAX_FILE_BYTES,
  parseRoster,
  markExisting,
  summarise,
  type ImportStatus,
  type ParsedRoster,
} from "@/lib/volunteers-import";

/**
 * Server actions for the bulk-import page.
 *
 * Three steps, three actions:
 *   1. parseFileAction(formData)       — decode + show preview, no DB writes
 *   2. confirmImportAction(formData)   — create the User rows (re-parses the
 *                                        file; never trusts client JSON)
 *   3. sendInvitesAction({ userIds })  — generate one-time tokens, send the
 *                                        claim email; bulk or single
 *
 * All three `requireAdmin()` first — these routes don't even acknowledge they
 * exist to non-admins, matching the convention in src/app/admin/actions.ts.
 */

/** Invites live for a week — long enough for casual readers, short enough to
 *  matter for revocation. Mirrors VolunteerInvite's schema comment. */
const INVITE_TTL_DAYS = 7;

/** SHA-256 of the raw token — only this is ever stored or queried. */
function hashToken(raw: string) {
  return createHash("sha256").update(raw).digest("hex");
}

// ---------------------------------------------------------------------------
// 1. Parse + preview (no DB writes)
// ---------------------------------------------------------------------------

export type ParseResult =
  | { ok: true; filename: string; roster: ParsedRoster; counts: Record<ImportStatus, number> }
  | { ok: false; error: string };

export async function parseFileAction(
  _prev: ParseResult | null,
  formData: FormData,
): Promise<ParseResult> {
  await requireAdmin();

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "Choose a CSV or .xlsx file to upload." };
  }
  // Short-circuit on FormData-reported size before we materialise the bytes.
  // parseRoster also caps post-buffer, but waiting until then means we've
  // already allocated the whole array for a 100 MB upload — an easy memory-
  // exhaustion shape on an admin route.
  if (file.size > MAX_FILE_BYTES) {
    return {
      ok: false,
      error: `That file is ${(file.size / 1024 / 1024).toFixed(1)} MB. The limit is ${MAX_FILE_BYTES / 1024 / 1024} MB — try splitting it.`,
    };
  }

  // We need the bytes server-side; File from a server-action form is a
  // standard web File so .arrayBuffer() works.
  const buffer = Buffer.from(await file.arrayBuffer());

  let roster: ParsedRoster;
  try {
    roster = await parseRoster(buffer, file.name);
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Couldn't read that file.",
    };
  }

  // Stamp duplicates against the User table.
  const candidateEmails = roster.rows
    .filter((r) => r.status === "new")
    .map((r) => r.email);
  const existing = candidateEmails.length
    ? await db.user.findMany({
        where: { email: { in: candidateEmails } },
        select: { email: true },
      })
    : [];
  const existingSet = new Set(existing.map((u) => u.email));
  markExisting(roster, existingSet);

  return {
    ok: true,
    filename: file.name,
    roster,
    counts: summarise(roster),
  };
}

// ---------------------------------------------------------------------------
// 2. Confirm import (creates User rows)
// ---------------------------------------------------------------------------

export type ConfirmResult =
  | {
      ok: true;
      created: number;
      skipped: number;
      errors: number;
      /** IDs of the rows we just created — handed back so the page can default
       *  the "send invites now" toggle to these specific users. */
      createdUserIds: string[];
    }
  | { ok: false; error: string };

export async function confirmImportAction(formData: FormData): Promise<ConfirmResult> {
  const admin = await requireAdmin();

  const file = formData.get("file");
  const sendInvitesRaw = formData.get("sendInvites");
  const sendInvites = sendInvitesRaw === "on" || sendInvitesRaw === "true";

  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "Choose a CSV or .xlsx file to upload." };
  }
  // Same early bail-out as parseFileAction — the confirm path also reads the
  // full buffer, so a 100 MB submit here would skip the preview's cap.
  if (file.size > MAX_FILE_BYTES) {
    return {
      ok: false,
      error: `That file is ${(file.size / 1024 / 1024).toFixed(1)} MB. The limit is ${MAX_FILE_BYTES / 1024 / 1024} MB — try splitting it.`,
    };
  }
  const buffer = Buffer.from(await file.arrayBuffer());

  let roster: ParsedRoster;
  try {
    roster = await parseRoster(buffer, file.name);
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Couldn't read that file.",
    };
  }

  // Re-check duplicates inside the confirm step — between the preview and the
  // confirm click, someone else may have signed up with one of these emails.
  // That row drops to "existing" and we skip it, no error.
  const candidateEmails = roster.rows
    .filter((r) => r.status === "new")
    .map((r) => r.email);
  const existing = candidateEmails.length
    ? await db.user.findMany({
        where: { email: { in: candidateEmails } },
        select: { email: true },
      })
    : [];
  const existingSet = new Set(existing.map((u) => u.email));
  markExisting(roster, existingSet);

  const toCreate = roster.rows.filter((r) => r.status === "new");
  const skipped = roster.rows.filter((r) => r.status === "existing" || r.status === "skip").length;
  const errors = roster.rows.filter((r) => r.status === "error").length;

  const createdUserIds: string[] = [];
  const now = new Date();

  // Batch insert via a single transaction: if anything trips, the partial
  // batch rolls back so the coordinator can fix the file and retry without
  // ending up with half a roster. createMany would be one DB hit but loses
  // the per-row returned id we need for the invite step — and 100-row inserts
  // are well within budget here.
  if (toCreate.length > 0) {
    try {
      const created = await db.$transaction(
        toCreate.map((row) =>
          db.user.create({
            data: {
              email: row.email,
              firstName: row.firstName,
              lastName: row.lastName,
              phone: row.phone,
              notes: row.notes,
              // Coordinator vouched for these addresses, but per the existing
              // convention we still wait for the volunteer's first click on the
              // invite link before flipping emailVerifiedAt — see resetPasswordAction.
              importedAt: now,
              // Soft gate is preserved: profileCompletedAt stays null so they
              // still complete the questionnaire before booking a shift.
            },
            select: { id: true },
          }),
        ),
      );
      createdUserIds.push(...created.map((u) => u.id));
    } catch (err: unknown) {
      // P2002 (unique-constraint violation on User.email) can fire if a
      // volunteer signs up between the pre-check `findMany` above and the
      // batch insert — milliseconds, but real. Surface as a typed result so
      // the client toast handler kicks in instead of an uncaught rejection.
      const isPrismaUnique =
        typeof err === "object" &&
        err !== null &&
        "code" in err &&
        (err as { code: unknown }).code === "P2002";
      if (isPrismaUnique) {
        return {
          ok: false,
          error:
            "One or more of these emails were registered while you were reviewing the preview. Re-upload the file to see the updated status.",
        };
      }
      throw err;
    }
  }

  // Optionally fire invites in the same call — coordinator opts in via a
  // checkbox on the preview screen. We use the same `sendInvitesAction` body
  // path below, but skip the requireAdmin re-check by inlining it.
  if (sendInvites && createdUserIds.length > 0) {
    await issueAndSendInvites(createdUserIds, admin.id);
  }

  revalidatePath("/admin/volunteers");
  revalidatePath("/admin/volunteers/import");

  return {
    ok: true,
    created: createdUserIds.length,
    skipped,
    errors,
    createdUserIds,
  };
}

// ---------------------------------------------------------------------------
// 3. Send / resend invites
// ---------------------------------------------------------------------------

const SendInvitesSchema = z.object({
  userIds: z.array(z.string().min(1)).min(1).max(1000),
});

export type SendInvitesResult =
  | { ok: true; sent: number; skipped: number }
  | { ok: false; error: string };

/**
 * Generate one-time invite tokens and email them. `userIds` may include
 * already-claimed accounts (e.g. an admin selecting "everyone" in the table) —
 * those are silently skipped via the `importedAt` filter, not surfaced as an
 * error, because the coordinator's intent ("invite these people") is already
 * satisfied for that subset.
 */
export async function sendInvitesAction(input: {
  userIds: string[];
}): Promise<SendInvitesResult> {
  const admin = await requireAdmin();
  const parsed = SendInvitesSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Pick at least one volunteer to invite." };
  }

  const result = await issueAndSendInvites(parsed.data.userIds, admin.id);
  revalidatePath("/admin/volunteers/import");
  return { ok: true, sent: result.sent, skipped: result.skipped };
}

/**
 * Shared body for "send invites" — both the confirm-import action (with the
 * just-created IDs) and the bulk-send button on the preview page use this.
 *
 * Per-user: drop any prior unredeemed token, issue a fresh one (7d TTL), email
 * the link. Skips users that have already redeemed an invite (importedAt is
 * null). A delivery failure for one address logs and continues — the rest of
 * the batch still goes out.
 *
 * `invitedById` is recorded on the VolunteerInvite row for audit only — it's
 * never surfaced in the email (the welcome copy is unsigned by design).
 */
async function issueAndSendInvites(
  userIds: readonly string[],
  invitedById: string,
): Promise<{ sent: number; skipped: number }> {
  // Pull the candidate users in one query. importedAt: { not: null } filters
  // out anyone who's already claimed — a benign no-op for invitable accounts.
  const users = await db.user.findMany({
    where: { id: { in: [...userIds] }, importedAt: { not: null } },
    select: { id: true, email: true, firstName: true },
  });

  let sent = 0;
  const skipped = userIds.length - users.length;

  for (const user of users) {
    // One live invite per user. Two concurrent resends (bulk + per-row, or
    // a double-click) can both observe the old token, both delete it, then
    // both insert — leaving two live tokens for one user, which violates
    // the "one live invite" invariant. Doing the delete+create atomically
    // inside a single transaction collapses that TOCTOU window.
    let raw!: string;
    await db.$transaction(async (tx) => {
      await tx.volunteerInvite.deleteMany({
        where: { userId: user.id, usedAt: null },
      });
      raw = randomBytes(32).toString("hex");
      await tx.volunteerInvite.create({
        data: {
          tokenHash: hashToken(raw),
          userId: user.id,
          invitedById,
          expiresAt: new Date(Date.now() + INVITE_TTL_DAYS * 24 * 3_600_000),
        },
      });
    });
    const claimUrl = `${appOrigin()}/auth/invite/${raw}`;
    try {
      await sendVolunteerInviteEmail({
        to: user.email,
        userId: user.id,
        claimUrl,
        userName: user.firstName || undefined,
        expiresInDays: INVITE_TTL_DAYS,
      });
      sent += 1;
    } catch (err) {
      // Same shape as the password-reset path: log, never throw. The
      // coordinator can hit "Resend" on this row from the pending-invites list.
      console.error(`[invite] failed to send to ${user.email}`, err);
    }
  }

  return { sent, skipped };
}
