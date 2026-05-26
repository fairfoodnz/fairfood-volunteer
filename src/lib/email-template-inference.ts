import { EmailTemplate } from "@/generated/prisma";

/**
 * Map a Resend subject line back to the `EmailTemplate` it was rendered from.
 *
 * Used by `scripts/backfill-resend-emails.ts` to retroactively tag historical
 * sends — emails sent before the EmailLog table existed live only in the
 * Resend dashboard, and we infer their template from the subject (the
 * only stable hint Resend keeps).
 *
 * Order matters: WELCOME's subject ("You're in — welcome to the Fair Food
 * volunteer whānau") and VOLUNTEER_INVITE's ("Welcome to the new Fair Food
 * volunteer portal — set your password") both contain "welcome" / "Welcome",
 * so the most specific prefix is tested first.
 *
 * Returns `null` for unknown subjects — the backfill script skips those
 * rather than mis-tag them. A coordinator can always cross-reference
 * Resend's dashboard for the original.
 *
 * NOTE: the canonical subject strings live in `src/lib/email.tsx`. If a
 * template's subject changes, **add** the new prefix here rather than
 * removing the old one — historical Resend rows still carry the old
 * subject text and we want to backfill them too.
 */
export function inferTemplateFromSubject(
  subject: string,
): EmailTemplate | null {
  const s = subject.trim();
  if (s.startsWith("Welcome to the new Fair Food volunteer portal")) {
    return EmailTemplate.VOLUNTEER_INVITE;
  }
  if (s.startsWith("Confirm your email")) {
    return EmailTemplate.VERIFY_EMAIL;
  }
  if (s.startsWith("Reset your Fair Food password")) {
    return EmailTemplate.PASSWORD_RESET;
  }
  if (s.startsWith("You're booked in")) {
    return EmailTemplate.BOOKING_CONFIRMATION;
  }
  // En-dash (—) is the canonical form; the ASCII hyphen variant covers
  // any historical send where the subject got typed with a plain dash.
  if (s.startsWith("Reminder — your") || s.startsWith("Reminder - your")) {
    return EmailTemplate.BOOKING_REMINDER;
  }
  if (s.startsWith("Cancelled — your") || s.startsWith("Cancelled - your")) {
    return EmailTemplate.BOOKING_CANCELLED;
  }
  if (s.startsWith("You're in")) {
    return EmailTemplate.WELCOME;
  }
  return null;
}
