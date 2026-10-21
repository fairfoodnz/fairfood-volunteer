import * as React from "react";
import { Heading, Text } from "@react-email/components";
import { appUrl, brand, org } from "./brand";
import { EmailLayout } from "./_components/layout";
import { EmailButton } from "./_components/button";
import { text } from "./_components/styles";

export interface WelcomeEmailProps {
  /** First name / display name, when known — falls back to a generic greeting. */
  userName?: string;
}

export default function WelcomeEmail({ userName }: WelcomeEmailProps) {
  const shiftsUrl = `${appUrl}/shifts`;
  return (
    <EmailLayout
      preview={`You're in — welcome to the ${org.name} volunteer whānau`}
    >
      <Heading
        as="h1"
        className={`m-0 mb-[24px] text-[24px] font-bold tracking-[-0.02em] text-[${brand.charcoal}]`}
      >
        Nau mai, haere mai
      </Heading>

      <Text className={text}>Kia ora{userName ? ` ${userName}` : ""},</Text>

      <Text className={text}>
        Your email is confirmed and you&apos;re officially part of the
        {` ${org.name} `} volunteer whānau. Every shift you give helps us rescue
        good kai and get it to the people who need it the most in our home
        community.
      </Text>

      <Text className={text}>
        Here&apos;s how it works: browse the open shifts, pick a time that suits
        you, and book it. We&apos;ll send a reminder the day before — just turn
        up ready to muck in.
      </Text>

      <EmailButton href={shiftsUrl}>Browse open shifts</EmailButton>

      <Text className={text}>
        If you haven&apos;t finished the short volunteer questionnaire yet,
        we&apos;ll ask you to wrap that up first so we can roster you safely —
        it only takes a couple of minutes.
      </Text>

      <Text className={`${text} mb-0`}>
        Ngā mihi nui,
        <br />
        The {org.name} team
      </Text>
    </EmailLayout>
  );
}

WelcomeEmail.PreviewProps = {
  userName: "Aroha",
} satisfies WelcomeEmailProps;
