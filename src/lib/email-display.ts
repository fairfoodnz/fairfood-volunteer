import "server-only";
import type { EmailTemplate, EmailLogStatus } from "@/generated/prisma";

/**
 * Human-readable labels for the EmailTemplate enum — used on the admin
 * email-log surfaces (volunteer detail page + standalone email view). The
 * enum values are stable audit labels, but coordinators don't want to read
 * SHOUTING_SNAKE_CASE in a list.
 */
export const EMAIL_TEMPLATE_LABELS: Record<EmailTemplate, string> = {
  VERIFY_EMAIL: "Email verification",
  WELCOME: "Welcome",
  PASSWORD_RESET: "Password reset",
  BOOKING_CONFIRMATION: "Booking confirmation",
  BOOKING_CANCELLED: "Booking cancellation",
  VOLUNTEER_INVITE: "Volunteer invite",
};

/**
 * Status badge classes for the admin email-log list. Failures get the tomato
 * accent the rest of the admin UI uses for things that need attention; dev-
 * logged uses a quiet neutral so a developer's local activity doesn't look
 * alarming when they later sign in to staging.
 */
export const EMAIL_STATUS_BADGE: Record<
  EmailLogStatus,
  { label: string; cls: string }
> = {
  SENT: {
    label: "Sent",
    cls: "bg-leaf/15 text-leaf-deep",
  },
  DEV_LOGGED: {
    label: "Dev only",
    cls: "bg-foreground/10 text-foreground/65",
  },
  FAILED: {
    label: "Failed",
    cls: "bg-tomato/15 text-tomato",
  },
};

const NZ_DATE_TIME = new Intl.DateTimeFormat("en-NZ", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
  timeZone: "Pacific/Auckland",
});

export function formatEmailTimestamp(d: Date) {
  return NZ_DATE_TIME.format(d);
}
