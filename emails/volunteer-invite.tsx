import * as React from "react";
import { Heading, Text } from "@react-email/components";
import { brand, org } from "./brand";
import { EmailLayout } from "./_components/layout";
import { EmailButton, FallbackLink } from "./_components/button";
import { text } from "./_components/styles";

export interface VolunteerInviteEmailProps {
  /** Tokenised claim link (one-time). */
  claimUrl: string;
  /** First name — falls back to a generic greeting. */
  userName?: string;
  /** Days the link stays valid. Mirrors the schema's 7-day TTL by default. */
  expiresInDays?: number;
}

export default function VolunteerInviteEmail({
  claimUrl,
  userName,
  expiresInDays = 7,
}: VolunteerInviteEmailProps) {
  return (
    <EmailLayout
      preview={`Welcome to the new ${org.name} volunteer portal — set your password to get started`}
    >
      <Heading
        as="h1"
        className={`m-0 mb-[24px] text-[24px] font-bold tracking-[-0.02em] text-[${brand.charcoal}]`}
      >
        Kia ora{userName ? ` ${userName}` : ""} — welcome to our new volunteer
        portal
      </Heading>

      {/* Single template-literal body — keeps the plain-text renderer
          from swallowing the spaces around `{org.name}`, which it does
          when JSX expressions sit adjacent to text nodes inside <Text>. */}
      <Text className={text}>
        {`There’s a new online home for ${org.name} volunteer scheduling, and we’ve moved your details across so you don’t have to start from scratch. Set a password and you can book shifts, manage your bookings, and stay in the loop with the kai whānau — all in one place.`}
      </Text>

      <EmailButton href={claimUrl}>Claim your account</EmailButton>

      <FallbackLink href={claimUrl} />

      <Text className={text}>
        The link expires in {expiresInDays} day{expiresInDays === 1 ? "" : "s"}.
        If this email landed in your inbox by mistake, you can ignore it —
        nothing happens until you click through.
      </Text>

      <Text className={`${text} mb-0`}>
        Ngā mihi nui,
        <br />
        The {org.name} team
      </Text>
    </EmailLayout>
  );
}

VolunteerInviteEmail.PreviewProps = {
  claimUrl: "https://volunteer.fairfood.org.nz/auth/invite/abc123def456",
  userName: "Aroha",
  expiresInDays: 7,
} satisfies VolunteerInviteEmailProps;
