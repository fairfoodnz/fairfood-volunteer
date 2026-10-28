import * as React from "react";
import {
  Column,
  Heading,
  Link,
  Row,
  Section,
  Text,
} from "@react-email/components";
import { brand, org } from "./brand";
import { EmailLayout } from "./_components/layout";
import { EmailButton } from "./_components/button";
import { detailLabel, detailValue, text } from "./_components/styles";
import type { CalendarLinks } from "../src/lib/calendar";

export interface BookingConfirmationEmailProps {
  /** First name / display name, when known — falls back to a generic greeting. */
  userName?: string;
  /** Programme this shift belongs to, e.g. "Kai Box". */
  programTitle: string;
  /** Pre-formatted NZ-local date/time range (see formatShiftRange). */
  whenLabel: string;
  /** Where to show up. */
  location: string;
  /**
   * The dress code, already split into paragraphs. Coordinators edit it in
   * /admin/settings (`whatToWear` in src/lib/site-copy.ts).
   */
  whatToWear: string[];
  /** The volunteer's own note on the booking, if they left one. */
  notes?: string;
  /** Link to manage / cancel the booking (the /me dashboard). */
  manageUrl: string;
  /** Per-client "add to calendar" deep links. */
  calendar: CalendarLinks;
}

export default function BookingConfirmationEmail({
  userName,
  programTitle,
  whenLabel,
  location,
  whatToWear,
  notes,
  manageUrl,
  calendar,
}: BookingConfirmationEmailProps) {
  const calendarOptions: { label: string; href: string }[] = [
    { label: "Google", href: calendar.google },
    { label: "Outlook", href: calendar.outlook },
    { label: "Office 365", href: calendar.office365 },
    { label: "Yahoo", href: calendar.yahoo },
  ];

  return (
    <EmailLayout
      preview={`You're booked in for ${programTitle} — ${whenLabel}`}
    >
      <Heading
        as="h1"
        className={`m-0 mb-[24px] text-[24px] font-bold tracking-[-0.02em] text-[${brand.charcoal}]`}
      >
        You&apos;re booked in <span aria-hidden="true">🎉</span>
      </Heading>

      <Text className={text}>Kia ora{userName ? ` ${userName}` : ""},</Text>

      <Text className={text}>
        Tēnā koe for putting your hand up — your spot is confirmed. Every pair
        of hands keeps good kai out of the landfill and on someone&apos;s plate.
        Here&apos;s what you&apos;ve signed up for:
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
          {whatToWear.map((p, i) => (
            <Text key={i} className={detailValue}>
              {p}
            </Text>
          ))}
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
          <strong>First time with us?</strong> Please arrive 15 minutes early so
          we can run you through a quick induction before the shift starts.
        </Text>
      </Section>

      <Heading
        as="h2"
        className={`m-0 mb-[12px] text-[18px] font-semibold text-[${brand.charcoal}]`}
      >
        Add it to your calendar
      </Heading>
      <Text className={text}>
        A calendar file is attached — open it on your phone or computer to add
        this shift to Apple Calendar or any app that reads <code>.ics</code>{" "}
        files. Prefer a web calendar? Pick yours:
      </Text>

      <Section className="mb-[28px]">
        <Row>
          {calendarOptions.map((opt) => (
            <Column key={opt.label} className="px-[4px]" align="center">
              {/* 12 + 20 + 12 + 2px border = 46px tall: a ≥44px tap target. */}
              <Link
                href={opt.href}
                className={`block box-border border border-solid border-[${brand.leafDeep}] px-[8px] py-[12px] text-center text-[14px] leading-[20px] font-semibold text-[${brand.leafDeep}] no-underline`}
              >
                {opt.label}
              </Link>
            </Column>
          ))}
        </Row>
      </Section>

      <EmailButton href={manageUrl}>View or manage your booking</EmailButton>

      <Text className={text}>
        Plans change — kei te pai. You can cancel any time from your dashboard
        so we can offer the spot to someone else. If something comes up last
        minute, get in touch and we&apos;ll sort it.
      </Text>

      <Text className={`${text} mb-0`}>
        Ngā mihi nui,
        <br />
        The {org.name} team
      </Text>
    </EmailLayout>
  );
}

BookingConfirmationEmail.PreviewProps = {
  userName: "Aroha",
  programTitle: "Kai Box",
  whenLabel: "Sat, 24 May · 9:00 am – 12:00 pm",
  location: "624 Rosebank Road, Avondale, Tāmaki Makaurau",
  whatToWear: [
    "Fully enclosed shoes with a closed toe and heel, hair tied back, and comfortable clothes you don't mind getting food on.",
  ],
  notes: "First time volunteering — looking forward to it!",
  manageUrl: "https://volunteer.fairfood.org.nz/me",
  calendar: {
    google: "https://calendar.google.com/calendar/render?action=TEMPLATE",
    outlook: "https://outlook.live.com/calendar/0/deeplink/compose",
    office365: "https://outlook.office.com/calendar/0/deeplink/compose",
    yahoo: "https://calendar.yahoo.com/",
  },
} satisfies BookingConfirmationEmailProps;
