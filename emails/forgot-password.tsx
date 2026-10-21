import * as React from "react";
import { Heading, Text } from "@react-email/components";
import { brand, org } from "./brand";
import { EmailLayout } from "./_components/layout";
import { EmailButton, FallbackLink } from "./_components/button";
import { text } from "./_components/styles";

export interface ForgotPasswordEmailProps {
  /** Tokenised reset link. */
  resetUrl: string;
  /** First name / display name, when known — falls back to a generic greeting. */
  userName?: string;
  /** How long the link stays valid, in hours. */
  expiresInHours?: number;
}

export default function ForgotPasswordEmail({
  resetUrl,
  userName,
  expiresInHours = 24,
}: ForgotPasswordEmailProps) {
  return (
    <EmailLayout
      preview={`Reset your ${org.name} password — link valid for ${expiresInHours} hours`}
    >
      <Heading
        as="h1"
        className={`m-0 mb-[24px] text-[24px] font-bold tracking-[-0.02em] text-[${brand.charcoal}]`}
      >
        Reset your password
      </Heading>

      <Text className={text}>Kia ora{userName ? ` ${userName}` : ""},</Text>

      <Text className={text}>
        We got a request to reset the password for your {org.name} account. Just
        like the kai we rescue, your account access doesn&apos;t have to go to
        waste — set a new password and you&apos;re back in.
      </Text>

      <EmailButton href={resetUrl}>Choose a new password</EmailButton>

      <FallbackLink href={resetUrl} />

      <Text className={text}>
        This link expires in {expiresInHours} hours for security. If you
        didn&apos;t ask for this, you can safely ignore this email — your
        account stays secure and nothing changes.
      </Text>

      <Text className={`${text} mb-0`}>
        Ngā mihi,
        <br />
        The {org.name} team
      </Text>
    </EmailLayout>
  );
}

ForgotPasswordEmail.PreviewProps = {
  resetUrl: "https://fairfood.org.nz/reset-password?token=abc123",
  userName: "Aroha",
  expiresInHours: 24,
} satisfies ForgotPasswordEmailProps;
