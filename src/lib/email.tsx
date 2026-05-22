import "server-only";
import * as React from "react";
import { render } from "@react-email/render";
import { Resend, type Attachment } from "resend";
import ForgotPasswordEmail from "../../emails/forgot-password";
import VerifyEmail from "../../emails/verify-email";
import WelcomeEmail from "../../emails/welcome";
import BookingConfirmationEmail from "../../emails/booking-confirmation";
import BookingCancelledEmail from "../../emails/booking-cancelled";
import VolunteerInviteEmail from "../../emails/volunteer-invite";
import { EmailLogStatus, EmailTemplate } from "@/generated/prisma";
import { db } from "@/lib/db";
import type { CalendarLinks } from "@/lib/calendar";

/**
 * Transactional email via Resend.
 *
 * `RESEND_API_KEY` is optional in development: with no key we log the rendered
 * plain-text body to the console instead of sending — the same pattern the
 * codebase uses elsewhere for dev-only links. In production the key must be
 * set or sends throw (a silently dropped password-reset email is worse than a
 * loud failure).
 *
 * `EMAIL_FROM` must be an address on a domain verified in Resend
 * (fairfood.org.nz). Format: `Name <addr@domain>` or a bare address.
 *
 * Every send (success, dev-noop, or failure) is recorded in `EmailLog` so
 * admins can see what was sent to a volunteer from /admin/volunteers/[id].
 * The log row is best-effort: if the DB write itself fails we log to console
 * and let the original send result through — we'd rather drop the audit
 * entry than break the actual mail flow.
 */
const FROM =
  process.env.EMAIL_FROM ?? "Fair Food <volunteering@fairfood.org.nz>";

const apiKey = process.env.RESEND_API_KEY;
const resend = apiKey ? new Resend(apiKey) : null;

/**
 * A file to attach. Derived from Resend's own `Attachment` so a field rename
 * in a future Resend major (e.g. `contentType`) fails the build here rather
 * than silently dropping the MIME header. We narrow `filename`/`content` to
 * required (Resend types them optional); `content` is the raw bytes, which
 * Resend base64-encodes.
 */
export type EmailAttachment = Pick<Attachment, "contentType"> & {
  filename: string;
  content: Buffer | string;
};

type SendArgs = {
  to: string;
  subject: string;
  /** A react-email document, e.g. <ForgotPasswordEmail … />. */
  react: React.ReactElement;
  attachments?: EmailAttachment[];
  /** Which template was rendered — required so the audit log knows. */
  template: EmailTemplate;
  /**
   * The volunteer this email is for, when known. Nullable so emails sent to a
   * bare address (e.g. a password reset for a non-existent account, though we
   * never actually send those) still get logged.
   */
  userId?: string | null;
};

/**
 * Best-effort EmailLog write. Swallows DB errors after console-logging so a
 * failed audit insert never breaks the underlying email send (the send is
 * already done by the time we get here).
 */
async function recordEmailLog(row: {
  userId: string | null;
  toEmail: string;
  subject: string;
  template: EmailTemplate;
  status: EmailLogStatus;
  providerId: string | null;
  error: string | null;
  bodyHtml: string;
  bodyText: string;
}) {
  try {
    await db.emailLog.create({ data: row });
  } catch (e) {
    console.error("[email-log] failed to record send", e);
  }
}

export async function sendEmail({
  to,
  subject,
  react,
  attachments,
  template,
  userId,
}: SendArgs) {
  const html = await render(react);
  const text = await render(react, { plainText: true });

  if (!resend) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "RESEND_API_KEY is not set — refusing to drop a transactional email in production.",
      );
    }
    const attachLine = attachments?.length
      ? `  attachments: ${attachments.map((a) => a.filename).join(", ")}\n`
      : "";
    console.log(
      `\n📧 [email:dev] would send via Resend\n  to: ${to}\n  subject: ${subject}\n  from: ${FROM}\n${attachLine}--- text body ---\n${text}\n-----------------\n`,
    );
    await recordEmailLog({
      userId: userId ?? null,
      toEmail: to,
      subject,
      template,
      status: EmailLogStatus.DEV_LOGGED,
      providerId: null,
      error: null,
      bodyHtml: html,
      bodyText: text,
    });
    return { id: "dev-noop" };
  }

  let data: Awaited<ReturnType<typeof resend.emails.send>>["data"] = null;
  let providerId: string | null = null;
  let sendError: Error | null = null;
  try {
    const result = await resend.emails.send({
      from: FROM,
      to,
      subject,
      html,
      text,
      attachments,
    });
    if (result.error) {
      sendError = new Error(
        `Resend send failed: ${result.error.name}: ${result.error.message}`,
      );
    } else {
      data = result.data;
      providerId = data?.id ?? null;
    }
  } catch (e) {
    sendError = e instanceof Error ? e : new Error(String(e));
  }

  await recordEmailLog({
    userId: userId ?? null,
    toEmail: to,
    subject,
    template,
    status: sendError ? EmailLogStatus.FAILED : EmailLogStatus.SENT,
    providerId,
    error: sendError ? sendError.message : null,
    bodyHtml: html,
    bodyText: text,
  });

  if (sendError) {
    // Surface the provider message; callers decide how to degrade.
    throw sendError;
  }
  return data;
}

/** Renders and sends the `emails/verify-email.tsx` template. */
export async function sendVerificationEmail(opts: {
  to: string;
  verifyUrl: string;
  userName?: string;
  expiresInHours?: number;
  userId?: string;
}) {
  const expiresInHours = opts.expiresInHours ?? 24;
  return sendEmail({
    to: opts.to,
    userId: opts.userId,
    template: EmailTemplate.VERIFY_EMAIL,
    subject: `Confirm your email to finish setting up your Fair Food account`,
    react: (
      <VerifyEmail
        verifyUrl={opts.verifyUrl}
        userName={opts.userName}
        expiresInHours={expiresInHours}
      />
    ),
  });
}

/** Renders and sends the `emails/welcome.tsx` template (post-verification). */
export async function sendWelcomeEmail(opts: {
  to: string;
  userName?: string;
  userId?: string;
}) {
  return sendEmail({
    to: opts.to,
    userId: opts.userId,
    template: EmailTemplate.WELCOME,
    subject: `You're in — welcome to the Fair Food volunteer whānau`,
    react: <WelcomeEmail userName={opts.userName} />,
  });
}

/** Renders and sends the existing `emails/forgot-password.tsx` template. */
export async function sendPasswordResetEmail(opts: {
  to: string;
  resetUrl: string;
  userName?: string;
  expiresInHours?: number;
  userId?: string;
}) {
  const expiresInHours = opts.expiresInHours ?? 24;
  return sendEmail({
    to: opts.to,
    userId: opts.userId,
    template: EmailTemplate.PASSWORD_RESET,
    subject: `Reset your Fair Food password — link valid for ${expiresInHours} hours`,
    react: (
      <ForgotPasswordEmail
        resetUrl={opts.resetUrl}
        userName={opts.userName}
        expiresInHours={expiresInHours}
      />
    ),
  });
}

/**
 * Renders and sends the booking confirmation, with the shift's `.ics` as an
 * attachment so native calendars (Apple Mail, etc.) get a one-tap add. The
 * `method=PUBLISH` content type tells clients it's an event to save, not a
 * meeting invite to RSVP to.
 */
export async function sendBookingConfirmationEmail(opts: {
  to: string;
  userName?: string;
  programTitle: string;
  whenLabel: string;
  location: string;
  notes?: string;
  manageUrl: string;
  calendar: CalendarLinks;
  ics: string;
  userId?: string;
}) {
  return sendEmail({
    to: opts.to,
    userId: opts.userId,
    template: EmailTemplate.BOOKING_CONFIRMATION,
    subject: `You're booked in — ${opts.programTitle}, ${opts.whenLabel}`,
    react: (
      <BookingConfirmationEmail
        userName={opts.userName}
        programTitle={opts.programTitle}
        whenLabel={opts.whenLabel}
        location={opts.location}
        notes={opts.notes}
        manageUrl={opts.manageUrl}
        calendar={opts.calendar}
      />
    ),
    attachments: [
      {
        filename: "fairfood-shift.ics",
        content: Buffer.from(opts.ics, "utf8"),
        contentType: "text/calendar; method=PUBLISH; charset=utf-8",
      },
    ],
  });
}

/**
 * Renders and sends the `emails/volunteer-invite.tsx` template — the welcome
 * "set your password" email that goes out after a coordinator bulk-imports a
 * roster onto the new volunteer portal. Phrased as a portal-launch welcome
 * rather than an account-claim notice so it lands as a continuation of the
 * volunteer's existing relationship with Fair Food, not a cold call.
 */
export async function sendVolunteerInviteEmail(opts: {
  to: string;
  claimUrl: string;
  userName?: string;
  expiresInDays?: number;
  userId?: string;
}) {
  const expiresInDays = opts.expiresInDays ?? 7;
  return sendEmail({
    to: opts.to,
    userId: opts.userId,
    template: EmailTemplate.VOLUNTEER_INVITE,
    subject: `Welcome to the new Fair Food volunteer portal — set your password`,
    react: (
      <VolunteerInviteEmail
        claimUrl={opts.claimUrl}
        userName={opts.userName}
        expiresInDays={expiresInDays}
      />
    ),
  });
}

/**
 * Renders and sends the `emails/booking-cancelled.tsx` template — notifies a
 * volunteer that an admin cancelled their booking (the volunteer's own
 * self-cancel doesn't email; they did it themselves). No `.ics` is attached:
 * there's nothing to add to a calendar, and clients have no reliable
 * cross-vendor "cancel this event" payload for a PUBLISH event.
 */
export async function sendBookingCancellationEmail(opts: {
  to: string;
  userName?: string;
  programTitle: string;
  whenLabel: string;
  location: string;
  userId?: string;
}) {
  return sendEmail({
    to: opts.to,
    userId: opts.userId,
    template: EmailTemplate.BOOKING_CANCELLED,
    subject: `Cancelled — your ${opts.programTitle} shift on ${opts.whenLabel}`,
    react: (
      <BookingCancelledEmail
        userName={opts.userName}
        programTitle={opts.programTitle}
        whenLabel={opts.whenLabel}
        location={opts.location}
      />
    ),
  });
}
