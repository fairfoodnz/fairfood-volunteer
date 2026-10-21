import * as React from "react";
import { Heading, Section, Text } from "@react-email/components";
import { appUrl, brand, org } from "./brand";
import { EmailLayout } from "./_components/layout";
import { EmailButton } from "./_components/button";
import { detailLabel, detailValue, text } from "./_components/styles";

export interface BookingCancelledEmailProps {
  /** First name / display name, when known — falls back to a generic greeting. */
  userName?: string;
  /** Programme this shift belonged to, e.g. "Kai Box". */
  programTitle: string;
  /** Pre-formatted NZ-local date/time range (see formatShiftRange). */
  whenLabel: string;
  /** Where the shift was. */
  location: string;
}

export default function BookingCancelledEmail({
  userName,
  programTitle,
  whenLabel,
  location,
}: BookingCancelledEmailProps) {
  const shiftsUrl = `${appUrl}/shifts`;

  return (
    <EmailLayout
      preview={`Your ${programTitle} shift on ${whenLabel} is cancelled`}
    >
      <Heading
        as="h1"
        className={`m-0 mb-[24px] text-[24px] font-bold tracking-[-0.02em] text-[${brand.charcoal}]`}
      >
        We&apos;ve cancelled your shift
      </Heading>

      <Text className={text}>Kia ora{userName ? ` ${userName}` : ""},</Text>

      <Text className={text}>
        We&apos;re getting in touch to let you know the Fair Food team has
        cancelled your booking for the shift below. Sometimes things change on
        our end and we have to adjust the roster — sorry for mucking you around,
        and ngā mihi for being so keen to help.
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
        <Section>
          <Text className={detailLabel}>Where</Text>
          <Text className={detailValue}>{location}</Text>
        </Section>
      </Section>

      <Text className={text}>
        We&apos;d really love to see you on another shift whenever it suits —
        every pair of hands keeps good kai out of the landfill and on
        someone&apos;s plate.
      </Text>

      <EmailButton href={shiftsUrl}>Find another shift</EmailButton>

      <Text className={text}>
        Not sure why this happened, or think it shouldn&apos;t have? Just reply
        to this email and we&apos;ll sort it out with you.
      </Text>

      <Text className={`${text} mb-0`}>
        Ngā mihi nui,
        <br />
        The {org.name} team
      </Text>
    </EmailLayout>
  );
}

BookingCancelledEmail.PreviewProps = {
  userName: "Aroha",
  programTitle: "Kai Box",
  whenLabel: "Sat, 24 May · 9:00 am – 12:00 pm",
  location: "624 Rosebank Road, Avondale, Tāmaki Makaurau",
} satisfies BookingCancelledEmailProps;
