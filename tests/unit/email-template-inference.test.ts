import { describe, expect, it } from "vitest";
import { inferTemplateFromSubject } from "@/lib/email-template-inference";
import { EmailTemplate } from "@/generated/prisma";

describe("inferTemplateFromSubject", () => {
  // The exact subjects sent today — keep this table in sync with
  // src/lib/email.tsx so a refactor that changes a subject is caught here.
  it.each<[string, EmailTemplate]>([
    [
      "Confirm your email to finish setting up your Fair Food account",
      EmailTemplate.VERIFY_EMAIL,
    ],
    [
      "You're in — welcome to the Fair Food volunteer whānau",
      EmailTemplate.WELCOME,
    ],
    [
      "Reset your Fair Food password — link valid for 24 hours",
      EmailTemplate.PASSWORD_RESET,
    ],
    [
      "You're booked in — Kai Box, Mon 15 Jun · 9:00 am – 12:00 pm",
      EmailTemplate.BOOKING_CONFIRMATION,
    ],
    [
      "Cancelled — your Kai Box shift on Mon 15 Jun",
      EmailTemplate.BOOKING_CANCELLED,
    ],
    [
      "Reminder — your Kai Box shift is tomorrow (Mon 15 Jun · 9:00 am – 12:00 pm)",
      EmailTemplate.BOOKING_REMINDER,
    ],
    [
      "Welcome to the new Fair Food volunteer portal — set your password",
      EmailTemplate.VOLUNTEER_INVITE,
    ],
  ])("recognises %s", (subject, expected) => {
    expect(inferTemplateFromSubject(subject)).toBe(expected);
  });

  it("prefers VOLUNTEER_INVITE over WELCOME for the invite subject", () => {
    // Both subjects contain "welcome" — the inviter prefix is more specific
    // and must win, otherwise every invite gets mis-tagged as a post-verify
    // welcome.
    expect(
      inferTemplateFromSubject(
        "Welcome to the new Fair Food volunteer portal — set your password",
      ),
    ).toBe(EmailTemplate.VOLUNTEER_INVITE);
  });

  it("accepts the ASCII-hyphen variant of the cancellation subject", () => {
    // Defensive: a historical send may have used "-" instead of the
    // canonical en-dash. Backfill should still tag it correctly rather
    // than silently dropping the row.
    expect(
      inferTemplateFromSubject(
        "Cancelled - your Kai Box shift on Mon 15 Jun",
      ),
    ).toBe(EmailTemplate.BOOKING_CANCELLED);
  });

  it("returns null for unknown subjects so they're skipped, not mis-tagged", () => {
    expect(inferTemplateFromSubject("Random newsletter")).toBeNull();
    expect(inferTemplateFromSubject("")).toBeNull();
    expect(inferTemplateFromSubject("reply to your message")).toBeNull();
  });

  it("ignores leading/trailing whitespace", () => {
    expect(
      inferTemplateFromSubject("  Confirm your email and so on  "),
    ).toBe(EmailTemplate.VERIFY_EMAIL);
  });
});
