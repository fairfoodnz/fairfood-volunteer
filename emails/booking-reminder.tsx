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

export interface BookingReminderEmailProps {
  /** First name / display name, when known — falls back to a generic greeting. */
  userName?: string;
  /** Programme this shift belongs to, e.g. "Kai Box". */
  programTitle: string;
  /** Pre-formatted NZ-local date/time range (see formatShiftRange). */
  whenLabel: string;
  /** Where to show up. */
  location: string;
  /** The volunteer's own note on the booking, if they left one. */
  notes?: string;
  /** Link to manage / cancel the booking (the /me dashboard). */
  manageUrl: string;
}

const text = `text-[16px] leading-[26px] text-[${brand.charcoal}] m-0 mb-[20px]`;
const detailLabel = `m-0 text-[12px] font-semibold uppercase tracking-[0.06em] text-[${brand.muted}]`;
const detailValue = `m-0 mt-[4px] text-[16px] leading-[24px] text-[${brand.charcoal}]`;

export default function BookingReminderEmail({
  userName,
  programTitle,
  whenLabel,
  location,
  notes,
  manageUrl,
}: BookingReminderEmailProps) {
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
      <Preview>{`See you tomorrow — ${programTitle}, ${whenLabel}`}</Preview>
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
              See you tomorrow 👋
            </Heading>

            <Text className={text}>Kia ora{userName ? ` ${userName}` : ""},</Text>

            <Text className={text}>
              Just a quick reminder that you&apos;re booked in for a Fair Food
              shift tomorrow. Every pair of hands keeps good kai out of the
              landfill and on someone&apos;s plate — we&apos;re looking forward
              to having you in.
            </Text>

            <Section
              className={`mb-[28px] border border-solid border-[${brand.border}] bg-[${brand.cream}] p-[24px]`}
            >
              <Section className="mb-[16px]">
                <Text className={detailLabel}>Programme</Text>
                <Text className={detailValue}>{programTitle}</Text>
              </Section>
              <Section className="mb-[16px]">
                <Text className={detailLabel}>When</Text>
                <Text className={detailValue}>{whenLabel}</Text>
              </Section>
              <Section className="mb-[16px]">
                <Text className={detailLabel}>Where</Text>
                <Text className={detailValue}>{location}</Text>
              </Section>
              <Section className={notes ? "mb-[16px]" : ""}>
                <Text className={detailLabel}>What to wear</Text>
                <Text className={detailValue}>
                  Please ensure you&apos;re wearing closed toed shoes, hair tied
                  back and comfortable clothes you don&apos;t mind getting food
                  on.
                </Text>
              </Section>
              {notes ? (
                <Section>
                  <Text className={detailLabel}>Your note</Text>
                  <Text className={detailValue}>{notes}</Text>
                </Section>
              ) : null}
            </Section>

            <Section
              className={`mb-[28px] border-l-[3px] border-l-solid border-l-[${brand.leafDeep}] bg-[${brand.cream}] px-[20px] py-[16px]`}
            >
              <Text
                className={`m-0 text-[15px] leading-[24px] text-[${brand.charcoal}]`}
              >
                <strong>First time with us?</strong> Please arrive 15 minutes
                early so we can run you through a quick induction before the
                shift starts.
              </Text>
            </Section>

            <Section className="my-[32px] text-center">
              <Button
                href={manageUrl}
                className={`box-border inline-block bg-[${brand.leafDeep}] px-[32px] py-[16px] text-[16px] font-semibold text-white no-underline`}
              >
                View or manage your booking
              </Button>
            </Section>

            <Text className={text}>
              Something come up? Kei te pai — you can cancel from your
              dashboard so we can offer the spot to someone else. If it&apos;s
              last minute, just reply to this email and we&apos;ll sort it.
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

BookingReminderEmail.PreviewProps = {
  userName: "Aroha",
  programTitle: "Kai Box",
  whenLabel: "Sat, 24 May · 9:00 am – 12:00 pm",
  location: "624 Rosebank Road, Avondale, Tāmaki Makaurau",
  notes: "First time volunteering — looking forward to it!",
  manageUrl: "https://volunteer.fairfood.org.nz/me",
} satisfies BookingReminderEmailProps;
