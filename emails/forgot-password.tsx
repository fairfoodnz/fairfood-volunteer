import * as React from "react";
import {
  Body,
  Button,
  Container,
  Font,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Tailwind,
  Text,
} from "@react-email/components";
import { brand, fontStack, org } from "./brand";

export interface ForgotPasswordEmailProps {
  /** Tokenised reset link. */
  resetUrl: string;
  /** First name / display name, when known — falls back to a generic greeting. */
  userName?: string;
  /** How long the link stays valid, in hours. */
  expiresInHours?: number;
}

const text = `text-[16px] leading-[26px] text-[${brand.charcoal}] m-0 mb-[20px]`;

export default function ForgotPasswordEmail({
  resetUrl,
  userName,
  expiresInHours = 24,
}: ForgotPasswordEmailProps) {
  return (
    <Html lang="en" dir="ltr">
      <Head>
        {/* Poppins is the Fair Food brand face (loaded app-side via next/font).
            Most email clients (Gmail, Outlook) ignore @font-face and use the
            fallback stack in brand.ts; Apple/iOS Mail honour these. v24 URLs
            verified against fonts.googleapis.com — body 400, button 600, heading 700. */}
        <Font
          fontFamily="Poppins"
          fallbackFontFamily="Arial"
          webFont={{
            url: "https://fonts.gstatic.com/s/poppins/v24/pxiEyp8kv8JHgFVrFJXUdVNF.woff2",
            format: "woff2",
          }}
          fontWeight={400}
          fontStyle="normal"
        />
        <Font
          fontFamily="Poppins"
          fallbackFontFamily="Arial"
          webFont={{
            url: "https://fonts.gstatic.com/s/poppins/v24/pxiByp8kv8JHgFVrLEj6V15vEv-L.woff2",
            format: "woff2",
          }}
          fontWeight={600}
          fontStyle="normal"
        />
        <Font
          fontFamily="Poppins"
          fallbackFontFamily="Arial"
          webFont={{
            url: "https://fonts.gstatic.com/s/poppins/v24/pxiByp8kv8JHgFVrLCz7V15vEv-L.woff2",
            format: "woff2",
          }}
          fontWeight={700}
          fontStyle="normal"
        />
      </Head>
      <Preview>{`Reset your ${org.name} password — link valid for ${expiresInHours} hours`}</Preview>
      <Tailwind>
        <Body
          className={`bg-[${brand.cream}] py-[40px] m-0`}
          style={{ fontFamily: fontStack }}
        >
          <Container
            className={`bg-[${brand.card}] mx-auto max-w-[600px] border border-solid border-[${brand.border}] p-[40px]`}
          >
            <Section className="mb-[36px] text-center">
              <Img
                src={org.logo}
                alt={org.name}
                width="180"
                className="mx-auto h-auto w-[180px] max-w-full"
              />
            </Section>

            <Heading
              as="h1"
              className={`m-0 mb-[24px] text-[24px] font-bold tracking-[-0.02em] text-[${brand.charcoal}]`}
            >
              Reset your password
            </Heading>

            <Text className={text}>
              Kia ora{userName ? ` ${userName}` : ""},
            </Text>

            <Text className={text}>
              We got a request to reset the password for your {org.name} account.
              Just like the kai we rescue, your account access doesn&apos;t have
              to go to waste — set a new password and you&apos;re back in.
            </Text>

            <Section className="my-[32px] text-center">
              <Button
                href={resetUrl}
                className={`box-border inline-block bg-[${brand.leafDeep}] px-[32px] py-[16px] text-[16px] font-semibold text-white no-underline`}
              >
                Choose a new password
              </Button>
            </Section>

            <Text className={text}>
              If the button doesn&apos;t work, copy and paste this link into
              your browser:
            </Text>
            <Text
              className={`text-[14px] leading-[22px] text-[${brand.leafDeep}] m-0 mb-[24px] break-all`}
            >
              <Link href={resetUrl} className={`text-[${brand.leafDeep}] underline`}>
                {resetUrl}
              </Link>
            </Text>

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

            <Hr className={`my-[32px] border-[${brand.border}]`} />

            <Section className="text-center">
              <Section className="mb-[16px] text-center">
                {org.social.map((s) => (
                  <Link
                    key={s.label}
                    href={s.href}
                    className="inline-block"
                  >
                    <Img
                      src={s.icon}
                      alt={s.label}
                      width="36"
                      height="36"
                      className="mx-[5px] inline-block"
                    />
                  </Link>
                ))}
              </Section>
              <Text
                className={`m-0 text-[13px] leading-[20px] text-[${brand.muted}]`}
              >
                {org.name} · {org.address}
              </Text>
              <Text
                className={`m-0 mt-[4px] text-[13px] leading-[20px] text-[${brand.muted}]`}
              >
                <Link
                  href={org.site}
                  className={`text-[${brand.leafDeep}] underline`}
                >
                  fairfood.org.nz
                </Link>
              </Text>
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}

ForgotPasswordEmail.PreviewProps = {
  resetUrl: "https://fairfood.org.nz/reset-password?token=abc123",
  userName: "Aroha",
  expiresInHours: 24,
} satisfies ForgotPasswordEmailProps;
