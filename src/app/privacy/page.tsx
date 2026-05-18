import Link from "next/link";
import { SiteNav } from "@/components/site/nav";
import { SiteFooter } from "@/components/site/footer";

export const metadata = {
  title: "Privacy policy · Fair Food Volunteer",
  description:
    "How Fair Food NZ collects, uses, and looks after the personal information you share through the volunteer portal.",
};

// Bump this whenever the substance of the policy changes.
const LAST_UPDATED = "18 May 2026";
const PRIVACY_CONTACT = "kiaora@fairfood.org.nz";

export default function PrivacyPage() {
  return (
    <>
      <SiteNav />
      <main className="flex-1 py-16 md:py-24">
        <div className="container-x max-w-3xl">
          <header className="mb-12">
            <p className="eyebrow">Tō tūmataitinga · Your privacy</p>
            <h1 className="display mt-2 text-balance text-4xl font-bold leading-tight md:text-5xl">
              Privacy policy
            </h1>
            <p className="mt-4 text-foreground/75">
              This explains what personal information the Fair Food NZ volunteer
              portal collects, why we collect it, and how we look after it. We
              only use your details to roster shifts and care for you on the
              day — never shared for marketing, never sold.
            </p>
            <p className="mt-3 text-sm text-foreground/55">
              Last updated {LAST_UPDATED}
            </p>
          </header>

          <div className="space-y-10">
            <Section title="Who we are">
              <p>
                The volunteer portal is operated by Fair Food NZ, a registered
                charitable organisation (charity number{" "}
                <a
                  href="https://register.charities.govt.nz/Charity/CC48507"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-leaf-deep underline-offset-4 hover:underline"
                >
                  CC48507
                </a>
                ), based at 624 Rosebank Road, Avondale, Tāmaki Makaurau
                Auckland. We are the agency responsible for the personal
                information you provide here, and we handle it in line with the
                New Zealand Privacy Act 2020 and its Information Privacy
                Principles.
              </p>
            </Section>

            <Section title="Information we collect">
              <p>We collect only what we need to run volunteering safely:</p>
              <ul className="ml-5 list-disc space-y-2 marker:text-leaf">
                <li>
                  <strong>Account details</strong> — your name and email
                  address, and (depending on how you sign in) a hashed
                  password, a link to your Google account, and/or registered
                  passkeys. See “How you sign in” below.
                </li>
                <li>
                  <strong>Volunteer profile</strong> — phone number, pronouns,
                  date of birth, an emergency contact name and phone number,
                  any access or support needs, and how you heard about us.
                </li>
                <li>
                  <strong>Onboarding questionnaire</strong> — your reasons for
                  volunteering and, so we can roster you safely and meet our
                  duty of care, sensitive information you choose to disclose
                  about relevant health conditions and any criminal or arrest
                  history. This is treated as confidential and seen only by
                  coordinators who need it.
                </li>
                <li>
                  <strong>Activity</strong> — the shifts you book, cancel, and
                  attend, and any notes a coordinator adds about a booking.
                </li>
                <li>
                  <strong>Technical</strong> — a secure session cookie that
                  keeps you signed in, and basic server logs (such as error
                  records) used to keep the service working.
                </li>
              </ul>
            </Section>

            <Section title="How you sign in">
              <p>
                You can sign in with an email and password, with Google, or
                with a passkey:
              </p>
              <ul className="ml-5 list-disc space-y-2 marker:text-leaf">
                <li>
                  <strong>Google sign-in.</strong> If you choose “Continue with
                  Google”, Google tells us your Google account’s unique
                  identifier, your email address, whether Google has verified
                  that email, and your name. We use this only to create or
                  match your volunteer account. We do not receive your Google
                  password and we request no access to any other Google data.
                  Your use of Google is also subject to Google’s own privacy
                  policy.
                </li>
                <li>
                  <strong>Passkeys.</strong> A passkey stores a public key and
                  a label you choose on our side; the private key never leaves
                  your device. We cannot use it to access anything else on your
                  device.
                </li>
                <li>
                  <strong>Passwords.</strong> Passwords are stored only as a
                  salted one-way hash — we never store or can see the original.
                </li>
              </ul>
            </Section>

            <Section title="How we use your information">
              <p>We use your information to:</p>
              <ul className="ml-5 list-disc space-y-2 marker:text-leaf">
                <li>create and secure your account and keep you signed in;</li>
                <li>
                  roster you onto shifts, manage attendance, and contact you
                  about your bookings (for example a reminder the day before);
                </li>
                <li>
                  keep volunteers and the people we serve safe, including
                  reviewing the safeguarding information in your questionnaire;
                </li>
                <li>
                  send essential transactional emails — sign-in verification,
                  password resets, and booking-related messages;
                </li>
                <li>
                  meet our legal, health-and-safety, and reporting obligations
                  as a charity.
                </li>
              </ul>
              <p>
                We do not use your information for advertising, and we do not
                sell it or trade it.
              </p>
            </Section>

            <Section title="Who we share it with">
              <p>
                Your information is seen by Fair Food coordinators who need it
                to roster and look after volunteers. We also rely on a small
                number of service providers who process information on our
                behalf, only to operate this service:
              </p>
              <ul className="ml-5 list-disc space-y-2 marker:text-leaf">
                <li>
                  <strong>Google</strong> — for the optional “Continue with
                  Google” sign-in.
                </li>
                <li>
                  <strong>Resend</strong> — to deliver our transactional
                  emails.
                </li>
                <li>
                  <strong>Our hosting and storage providers</strong> — who run
                  the servers and file storage the portal operates on.
                </li>
              </ul>
              <p>
                These providers may process information outside New Zealand. We
                share information with them only as needed to run the portal,
                and otherwise disclose personal information only where the law
                requires or allows it (for example a serious safety concern).
              </p>
            </Section>

            <Section title="How long we keep it">
              <p>
                We keep your account and volunteer information for as long as
                you are an active or returning volunteer, and afterwards only
                for as long as we need it to meet legal, safety, and reporting
                obligations. You can ask us to delete your account at any time
                (see below); some records may be retained where the law
                requires.
              </p>
            </Section>

            <Section title="Keeping it safe">
              <p>
                Access is restricted to authenticated users and authorised
                coordinators. Passwords are hashed, sign-in and reset links are
                single-use and time-limited, sessions use a secure
                HTTP-only cookie, and connections are encrypted in transit. No
                system is perfectly secure, but we take reasonable steps to
                protect your information and review them as the service
                changes.
              </p>
            </Section>

            <Section title="Your rights">
              <p>
                Under the Privacy Act 2020 you can ask to see the personal
                information we hold about you and request that we correct it.
                Much of it you can view and update yourself on your{" "}
                <Link
                  href="/me/profile"
                  className="font-medium text-leaf-deep underline-offset-4 hover:underline"
                >
                  profile
                </Link>{" "}
                and{" "}
                <Link
                  href="/me/security"
                  className="font-medium text-leaf-deep underline-offset-4 hover:underline"
                >
                  sign-in &amp; security
                </Link>{" "}
                pages. To request access, correction, or deletion, contact us
                using the details below. If you are not satisfied with how we
                have handled your information, you can raise it with the{" "}
                <a
                  href="https://www.privacy.org.nz"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-leaf-deep underline-offset-4 hover:underline"
                >
                  Office of the Privacy Commissioner
                </a>
                .
              </p>
            </Section>

            <Section title="Changes to this policy">
              <p>
                We may update this policy as the portal evolves. We will change
                the “last updated” date above, and for significant changes
                we’ll let signed-in volunteers know.
              </p>
            </Section>

            <Section title="Contact us">
              <p>
                For any privacy question or request, email{" "}
                <a
                  href={`mailto:${PRIVACY_CONTACT}?subject=Privacy%20request`}
                  className="font-medium text-leaf-deep underline-offset-4 hover:underline"
                >
                  {PRIVACY_CONTACT}
                </a>
                , or write to us at Fair Food NZ, 624 Rosebank Road, Avondale,
                Tāmaki Makaurau Auckland.
              </p>
            </Section>
          </div>

          <p className="mt-12 text-sm text-foreground/65">
            <Link
              href="/"
              className="font-semibold text-leaf-deep underline-offset-4 hover:underline"
            >
              ← Back home
            </Link>
          </p>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <h2 className="display text-2xl font-semibold">{title}</h2>
      <div className="space-y-3 leading-relaxed text-foreground/80">
        {children}
      </div>
    </section>
  );
}
