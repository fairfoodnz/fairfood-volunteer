import * as React from "react";
import { Button, Link, Section, Text } from "@react-email/components";
import { brand } from "../brand";
import { text } from "./styles";

/** The single primary call to action: white on leafDeep (5.63:1), centred. */
export function EmailButton({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Section className="my-[32px] text-center">
      <Button
        href={href}
        className={`box-border inline-block bg-[${brand.leafDeep}] px-[32px] py-[16px] text-[16px] font-semibold text-white no-underline`}
      >
        {children}
      </Button>
    </Section>
  );
}

/**
 * "If the button doesn't work…" — the raw URL under a tokenised CTA, for
 * clients that mangle buttons or users who'd rather paste.
 */
export function FallbackLink({ href }: { href: string }) {
  return (
    <>
      <Text className={text}>
        If the button doesn&apos;t work, copy and paste this link into your
        browser:
      </Text>
      <Text
        className={`text-[14px] leading-[22px] text-[${brand.leafDeep}] m-0 mb-[24px] break-all`}
      >
        <Link href={href} className={`text-[${brand.leafDeep}] underline`}>
          {href}
        </Link>
      </Text>
    </>
  );
}
