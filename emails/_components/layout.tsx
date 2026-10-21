import * as React from "react";
import {
  Body,
  Container,
  Font,
  Head,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Tailwind,
  Text,
} from "@react-email/components";
import { brand, fontStack, org } from "../brand";

/**
 * The shared shell for every Fair Food email: head (fonts, colour-scheme),
 * preview text, the white card on cream, the logo header and the footer.
 *
 * Lives in `_components/` because react-email's preview server (`pnpm
 * email:dev`) skips underscore-prefixed folders when it lists templates — and
 * nothing here has a default export, which is the other thing it looks for.
 */

/**
 * Mobile padding. Hand-written rather than a Tailwind `max-sm:` variant because
 * Tailwind v4 emits range-syntax media queries (`width < 40rem`), which older
 * mail clients' CSS parsers drop; the classic `max-width` form is the one
 * Gmail, Apple Mail and Outlook.com all understand. Clients that strip <style>
 * (Outlook desktop) keep the desktop padding, which is fine at 600px.
 */
const responsiveCss = `
:root { color-scheme: light; supported-color-schemes: light; }
@media only screen and (max-width: 600px) {
  .ff-card { padding: 24px !important; }
}
`;

export function EmailLayout({
  preview,
  children,
}: {
  /** Inbox preview line (the grey text after the subject). */
  preview: string;
  children: React.ReactNode;
}) {
  return (
    <Html lang="en" dir="ltr">
      {/* <Head> sits inside <Tailwind> so it has somewhere to put any
          non-inlinable (media-query) rules. */}
      <Tailwind>
        <Head>
          {/* Light only: the palette is designed for cream/white, and these
              ask Apple Mail / Outlook.com not to auto-darken it. Clients that
              force-invert (Gmail apps) ignore them — see the logo below. */}
          <meta name="color-scheme" content="light" />
          <meta name="supported-color-schemes" content="light" />
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
          <style>{responsiveCss}</style>
        </Head>
        <Body
          className={`bg-[${brand.cream}] py-[40px] m-0`}
          style={{ fontFamily: fontStack }}
        >
          <Preview>{preview}</Preview>
          <Container
            className={`ff-card bg-[${brand.card}] mx-auto max-w-[600px] border border-solid border-[${brand.border}] p-[40px]`}
          >
            <EmailHeader />
            {children}
            <EmailFooter />
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}

/**
 * The logo. `public/email/logo.png` is a dark circle whose "fair food"
 * letterforms are *transparent*, so they show whatever is behind them. The
 * explicit white backing cell keeps them white in clients that darken the
 * page but leave explicitly-coloured cells alone. Clients that force-invert
 * everything (Gmail apps) can still darken that cell; the full fix is a logo
 * with the letterforms baked in opaque white.
 */
function EmailHeader() {
  return (
    <Section className="mb-[36px] text-center">
      <table
        role="presentation"
        align="center"
        border={0}
        cellPadding={0}
        cellSpacing={0}
        bgcolor={brand.card}
        style={{
          margin: "0 auto",
          backgroundColor: brand.card,
          borderRadius: "9999px",
        }}
      >
        <tbody>
          <tr>
            <td style={{ padding: "6px" }}>
              <Img
                src={org.logo}
                alt={org.name}
                width="180"
                height="180"
                className="mx-auto h-auto w-[180px] max-w-full"
              />
            </td>
          </tr>
        </tbody>
      </table>
    </Section>
  );
}

function EmailFooter() {
  return (
    <>
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
    </>
  );
}
