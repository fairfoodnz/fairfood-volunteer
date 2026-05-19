import "server-only";
import * as React from "react";
import { render } from "@react-email/render";
import { Resend, type Attachment } from "resend";
import ForgotPasswordEmail from "../../emails/forgot-password";
import VerifyEmail from "../../emails/verify-email";
import WelcomeEmail from "../../emails/welcome";
import BookingConfirmationEmail from "../../emails/booking-confirmation";
import BookingCancelledEmail from "../../emails/booking-cancelled";
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
};

export async function sendEmail({ to, subject, react, attachments }: SendArgs) {
  const html = await render(react);
  const text = await render(react, { plainText: true });

  if (!resend) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "RESEND_API_KEY is not set — refusing to drop a transactional email in production."
      );
    }
    const attachLine = attachments?.length
      ? `  attachments: ${attachments.map((a) => a.filename).join(", ")}\n`
      : "";
    console.log(
      `\n📧 [email:dev] would send via Resend\n  to: ${to}\n  subject: ${subject}\n  from: ${FROM}\n${attachLine}--- text body ---\n${text}\n-----------------\n`
    );
    return { id: "dev-noop" };
  }

  const { data, error } = await resend.emails.send({
    from: FROM,
    to,
    subject,
    html,
    text,
    attachments,
  });

  if (error) {
    // Surface the provider message; callers decide how to degrade.
    throw new Error(`Resend send failed: ${error.name}: ${error.message}`);
  }
  return data;
}

/** Renders and sends the `emails/verify-email.tsx` template. */
export async function sendVerificationEmail(opts: {
  to: string;
  verifyUrl: string;
  userName?: string;
  expiresInHours?: number;
}) {
  const expiresInHours = opts.expiresInHours ?? 24;
  return sendEmail({
    to: opts.to,
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
}) {
  return sendEmail({
    to: opts.to,
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
}) {
  const expiresInHours = opts.expiresInHours ?? 24;
  return sendEmail({
    to: opts.to,
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
}) {
  return sendEmail({
    to: opts.to,
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
}) {
  return sendEmail({
    to: opts.to,
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
