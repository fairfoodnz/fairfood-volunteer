import "server-only";
import * as React from "react";
import { render } from "@react-email/render";
import { Resend } from "resend";
import ForgotPasswordEmail from "../../emails/forgot-password";
import VerifyEmail from "../../emails/verify-email";
import WelcomeEmail from "../../emails/welcome";

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
const FROM = process.env.EMAIL_FROM ?? "Fair Food NZ <noreply@fairfood.org.nz>";

const apiKey = process.env.RESEND_API_KEY;
const resend = apiKey ? new Resend(apiKey) : null;

type SendArgs = {
  to: string;
  subject: string;
  /** A react-email document, e.g. <ForgotPasswordEmail … />. */
  react: React.ReactElement;
};

export async function sendEmail({ to, subject, react }: SendArgs) {
  const html = await render(react);
  const text = await render(react, { plainText: true });

  if (!resend) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "RESEND_API_KEY is not set — refusing to drop a transactional email in production.",
      );
    }
    console.log(
      `\n📧 [email:dev] would send via Resend\n  to: ${to}\n  subject: ${subject}\n  from: ${FROM}\n--- text body ---\n${text}\n-----------------\n`,
    );
    return { id: "dev-noop" };
  }

  const { data, error } = await resend.emails.send({
    from: FROM,
    to,
    subject,
    html,
    text,
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
    subject: `Confirm your email to finish setting up your Fair Food NZ account`,
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
    subject: `You're in — welcome to the Fair Food NZ volunteer whānau`,
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
    subject: `Reset your Fair Food NZ password — link valid for ${expiresInHours} hours`,
    react: (
      <ForgotPasswordEmail
        resetUrl={opts.resetUrl}
        userName={opts.userName}
        expiresInHours={expiresInHours}
      />
    ),
  });
}
