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

export interface VolunteerInviteEmailProps {
  /** Tokenised claim link (one-time). */
  claimUrl: string;
  /** First name — falls back to a generic greeting. */
  userName?: string;
  /** Days the link stays valid. Mirrors the schema's 7-day TTL by default. */
  expiresInDays?: number;
}

const text = `text-[16px] leading-[26px] text-[${brand.charcoal}] m-0 mb-[20px]`;

export default function VolunteerInviteEmail({
  claimUrl,
  userName,
  expiresInDays = 7,
}: VolunteerInviteEmailProps) {
  return (
    <Html lang="en" dir="ltr">
      <Head>
        {/* Poppins — same three weights the other templates load. Most clients
            ignore @font-face and use the fallback stack; Apple/iOS Mail honour
            these. */}
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
      <Preview>{`Welcome to the new ${org.name} volunteer portal — set your password to get started`}</Preview>
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
              Kia ora{userName ? ` ${userName}` : ""} — welcome to our new
              volunteer portal
            </Heading>

            {/* Single template-literal body — keeps the plain-text renderer
                from swallowing the spaces around `{org.name}`, which it does
                when JSX expressions sit adjacent to text nodes inside <Text>. */}
            <Text className={text}>
              {`There’s a new online home for ${org.name} volunteer scheduling, and we’ve moved your details across so you don’t have to start from scratch. Set a password and you can book shifts, manage your bookings, and stay in the loop with the kai whānau — all in one place.`}
            </Text>

            <Section className="my-[32px] text-center">
              <Button
                href={claimUrl}
                className={`box-border inline-block bg-[${brand.leafDeep}] px-[32px] py-[16px] text-[16px] font-semibold text-white no-underline`}
              >
                Claim your account
              </Button>
            </Section>

            <Text className={text}>
              If the button doesn&apos;t work, copy and paste this link into
              your browser:
            </Text>
            <Text
              className={`text-[14px] leading-[22px] text-[${brand.leafDeep}] m-0 mb-[24px] break-all`}
            >
              <Link href={claimUrl} className={`text-[${brand.leafDeep}] underline`}>
                {claimUrl}
              </Link>
            </Text>

            <Text className={text}>
              The link expires in {expiresInDays} day{expiresInDays === 1 ? "" : "s"}. If
              this email landed in your inbox by mistake, you can ignore it —
              nothing happens until you click through.
            </Text>

            <Text className={`${text} mb-0`}>
              Ngā mihi nui,
              <br />
              The {org.name} team
            </Text>

            <Hr className={`my-[32px] border-[${brand.border}]`} />

            <Section className="text-center">
              <Section className="mb-[16px] text-center">
                {org.social.map((s) => (
                  <Link key={s.label} href={s.href} className="inline-block">
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

VolunteerInviteEmail.PreviewProps = {
  claimUrl: "https://volunteer.fairfood.org.nz/auth/invite/abc123def456",
  userName: "Aroha",
  expiresInDays: 7,
} satisfies VolunteerInviteEmailProps;
