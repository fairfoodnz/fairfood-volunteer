import * as React from "react";
import { Heading, Section, Text } from "@react-email/components";
import { brand, org } from "./brand";
import { EmailLayout } from "./_components/layout";
import { EmailButton } from "./_components/button";
import { detailLabel, detailValue, text } from "./_components/styles";

export interface BookingReminderEmailProps {
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
}

export default function BookingReminderEmail({
  userName,
  programTitle,
  whenLabel,
  location,
  whatToWear,
  notes,
  manageUrl,
}: BookingReminderEmailProps) {
  return (
    <EmailLayout preview={`See you tomorrow — ${programTitle}, ${whenLabel}`}>
      <Heading
        as="h1"
        className={`m-0 mb-[24px] text-[24px] font-bold tracking-[-0.02em] text-[${brand.charcoal}]`}
      >
        See you tomorrow <span aria-hidden="true">👋</span>
      </Heading>

      <Text className={text}>Kia ora{userName ? ` ${userName}` : ""},</Text>

      <Text className={text}>
        Just a quick reminder that you&apos;re booked in for a Fair Food shift
        tomorrow. Every pair of hands keeps good kai out of the landfill and on
        someone&apos;s plate — we&apos;re looking forward to having you in.
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

      <EmailButton href={manageUrl}>View or manage your booking</EmailButton>

      <Text className={text}>
        Something come up? Kei te pai — you can cancel from your dashboard so we
        can offer the spot to someone else. If it&apos;s last minute, just reply
        to this email and we&apos;ll sort it.
      </Text>

      <Text className={`${text} mb-0`}>
        Ngā mihi nui,
        <br />
        The {org.name} team
      </Text>
    </EmailLayout>
  );
}

BookingReminderEmail.PreviewProps = {
  userName: "Aroha",
  programTitle: "Kai Box",
  whenLabel: "Sat, 24 May · 9:00 am – 12:00 pm",
  location: "624 Rosebank Road, Avondale, Tāmaki Makaurau",
  whatToWear: [
    "Fully enclosed shoes with a closed toe and heel, hair tied back, and comfortable clothes you don't mind getting food on.",
  ],
  notes: "First time volunteering — looking forward to it!",
  manageUrl: "https://volunteer.fairfood.org.nz/me",
} satisfies BookingReminderEmailProps;
