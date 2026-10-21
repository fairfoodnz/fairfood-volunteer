import * as React from "react";
import { Heading, Text } from "@react-email/components";
import { brand, org } from "./brand";
import { EmailLayout } from "./_components/layout";
import { EmailButton, FallbackLink } from "./_components/button";
import { text } from "./_components/styles";

export interface VerifyEmailProps {
  /** Tokenised verification link. */
  verifyUrl: string;
  /** First name / display name, when known — falls back to a generic greeting. */
  userName?: string;
  /** How long the link stays valid, in hours. */
  expiresInHours?: number;
}

export default function VerifyEmail({
  verifyUrl,
  userName,
  expiresInHours = 24,
}: VerifyEmailProps) {
  return (
    <EmailLayout
      preview={`Confirm your email to finish setting up your ${org.name} account`}
    >
      <Heading
        as="h1"
        className={`m-0 mb-[24px] text-[24px] font-bold tracking-[-0.02em] text-[${brand.charcoal}]`}
      >
        Confirm your email
      </Heading>

      <Text className={text}>Kia ora{userName ? ` ${userName}` : ""},</Text>

      <Text className={text}>
        Welcome to the kai table! Just one quick step — confirm this is your
        email so we can send you shift reminders and roster updates. Once
        you&apos;re verified you can book your first shift.
      </Text>

      <EmailButton href={verifyUrl}>Verify my email</EmailButton>

      <FallbackLink href={verifyUrl} />

      <Text className={text}>
        This link expires in {expiresInHours} hours. If you didn&apos;t create a{" "}
        {org.name} account, you can safely ignore this email — nothing will
        happen without it.
      </Text>

      <Text className={`${text} mb-0`}>
        Ngā mihi,
        <br />
        The {org.name} team
      </Text>
    </EmailLayout>
  );
}

VerifyEmail.PreviewProps = {
  verifyUrl: "https://volunteer.fairfood.org.nz/auth/verify-email?token=abc123",
  userName: "Aroha",
  expiresInHours: 24,
} satisfies VerifyEmailProps;
