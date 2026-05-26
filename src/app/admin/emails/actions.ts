"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { resendStoredEmail } from "@/lib/email";
import { EmailLogStatus } from "@/generated/prisma";

const RetryEmailSchema = z.object({ emailLogId: z.string().min(1) });

export type RetryEmailState = { error?: string; ok?: boolean };

/**
 * Re-send a FAILED EmailLog row's stored HTML/text body via Resend. Used by
 * the admin "Retry" button on the volunteer detail page and the standalone
 * email view to recover individual sends that hit a transient Resend error
 * (rate limit, network blip, etc.) — the booking-reminder cron is the main
 * source of these, since it's the one place we batch-send.
 *
 * Only FAILED rows are retryable. SENT was already delivered; DEV_LOGGED
 * exists only on dev machines without a Resend key and would be a noop.
 * Both are gated client-side (we don't render the button), but we also
 * gate server-side so a hand-crafted POST can't pin the noop case.
 *
 * The retry attempt creates a *new* EmailLog row (status SENT or FAILED)
 * — the original is preserved as audit trail. Errors are returned in
 * state rather than thrown so the form can render an inline message
 * instead of crashing the page.
 */
export async function retryEmailAction(
  _prev: RetryEmailState,
  formData: FormData,
): Promise<RetryEmailState> {
  await requireAdmin();
  const parsed = RetryEmailSchema.safeParse({
    emailLogId: formData.get("emailLogId"),
  });
  if (!parsed.success) return { error: "Missing email id." };

  const row = await db.emailLog.findUnique({
    where: { id: parsed.data.emailLogId },
    select: {
      id: true,
      userId: true,
      toEmail: true,
      subject: true,
      template: true,
      bodyHtml: true,
      bodyText: true,
      status: true,
    },
  });
  if (!row) return { error: "Email not found." };
  if (row.status !== EmailLogStatus.FAILED) {
    return { error: "Only failed sends can be retried." };
  }

  try {
    await resendStoredEmail({
      toEmail: row.toEmail,
      subject: row.subject,
      bodyHtml: row.bodyHtml,
      bodyText: row.bodyText,
      template: row.template,
      userId: row.userId,
    });
  } catch (e) {
    // `resendStoredEmail` already wrote a FAILED EmailLog row before throwing,
    // so the audit trail captures the new attempt. Surface the provider
    // message to the admin so they can decide whether to retry again or
    // wait (e.g. rate limit vs invalid recipient).
    const reason = e instanceof Error ? e.message : String(e);
    if (row.userId) revalidatePath(`/admin/volunteers/${row.userId}`);
    revalidatePath(`/admin/emails/${row.id}`);
    return { error: reason };
  }

  if (row.userId) revalidatePath(`/admin/volunteers/${row.userId}`);
  revalidatePath(`/admin/emails/${row.id}`);
  return { ok: true };
}
