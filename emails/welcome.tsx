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
import { appUrl, brand, fontStack, org } from "./brand";

export interface WelcomeEmailProps {
  /** First name / display name, when known — falls back to a generic greeting. */
  userName?: string;
}

const text = `text-[16px] leading-[26px] text-[${brand.charcoal}] m-0 mb-[20px]`;

export default function WelcomeEmail({ userName }: WelcomeEmailProps) {
  const shiftsUrl = `${appUrl}/shifts`;
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
      <Preview>{`You're in — welcome to the ${org.name} volunteer whānau`}</Preview>
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
              Nau mai, haere mai
            </Heading>

            <Text className={text}>
              Kia ora{userName ? ` ${userName}` : ""},
            </Text>

            <Text className={text}>
              Your email is confirmed and you&apos;re officially part of the
              {` ${org.name} `} volunteer whānau. Every shift you give helps us
              rescue good kai and get it to the people who need it.
            </Text>

            <Text className={text}>
              Here&apos;s how it works: browse the open shifts, pick a time that
              suits you, and book it. We&apos;ll send a reminder the day before
              — just turn up ready to muck in.
            </Text>

            <Section className="my-[32px] text-center">
              <Button
                href={shiftsUrl}
                className={`box-border inline-block bg-[${brand.leafDeep}] px-[32px] py-[16px] text-[16px] font-semibold text-white no-underline`}
              >
                Browse open shifts
              </Button>
            </Section>

            <Text className={text}>
              If you haven&apos;t finished the short volunteer questionnaire yet,
              we&apos;ll ask you to wrap that up first so we can roster you
              safely — it only takes a couple of minutes.
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

WelcomeEmail.PreviewProps = {
  userName: "Aroha",
} satisfies WelcomeEmailProps;
