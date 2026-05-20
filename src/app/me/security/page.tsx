import Link from "next/link";
import { CheckCircle2, AlertCircle } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { googleConfigured, GOOGLE_PROVIDER } from "@/lib/oauth";
import { SiteNav } from "@/components/site/nav";
import { SiteFooter } from "@/components/site/footer";
import { Button } from "@/components/ui/button";
import { GoogleButton } from "@/components/auth/google-button";
import { ChangePasswordForm } from "./change-password-form";
import { PasskeyManager, type PasskeyView } from "./passkey-manager";
import { disconnectGoogleAction } from "./actions";

export const metadata = { title: "Sign-in & security · Fair Food Volunteer" };
export const dynamic = "force-dynamic";

const dateFmt = new Intl.DateTimeFormat("en-NZ", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "Pacific/Auckland",
});

const ERROR_COPY: Record<string, string> = {
  last_method:
    "That's your only way to sign in — add another method before removing this one.",
  google_taken:
    "That Google account is already linked to a different Fair Food account.",
  google_exists:
    "A Google account is already connected. Disconnect it before linking another.",
  google_failed: "Something went wrong with Google. Please try again.",
};

type Props = {
  searchParams: Promise<{ connected?: string; error?: string }>;
};

export default async function SecurityPage({ searchParams }: Props) {
  const user = await requireUser();
  const { connected, error } = await searchParams;

  const [passkeys, googleAccount] = await Promise.all([
    db.passkey.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "asc" },
    }),
    db.oAuthAccount.findFirst({
      where: { userId: user.id, provider: GOOGLE_PROVIDER },
    }),
  ]);

  const hasPassword = Boolean(user.passwordHash);
  const passkeyViews: PasskeyView[] = passkeys.map((p) => ({
    id: p.id,
    name: p.name,
    createdAt: dateFmt.format(p.createdAt),
    lastUsedAt: p.lastUsedAt ? dateFmt.format(p.lastUsedAt) : null,
  }));

  return (
    <>
      <SiteNav />
      <main className="flex-1 py-12 md:py-16">
        <div className="container-x max-w-3xl">
          <header className="mb-8">
            <p className="eyebrow">Kia ora, {user.firstName}</p>
            <h1 className="display mt-2 text-balance text-4xl font-bold leading-tight md:text-5xl">
              Sign-in &amp; security
            </h1>
            <p className="mt-3 text-foreground/75">
              Choose how you get into your account. We recommend keeping at
              least two ways in.
            </p>
          </header>

          {connected === "google" && (
            <Banner tone="success">Google connected. You can now sign in with it.</Banner>
          )}
          {error && (
            <Banner tone="error">
              {ERROR_COPY[error] ?? "Something went wrong. Please try again."}
            </Banner>
          )}

          <div className="space-y-6">
            {/* Password ------------------------------------------------- */}
            <Section
              title="Password"
              desc={
                hasPassword
                  ? "A password is set for this account."
                  : "Add a password so you can sign in without Google or a passkey."
              }
            >
              <ChangePasswordForm hasPassword={hasPassword} />
            </Section>

            {/* Google --------------------------------------------------- */}
            <Section
              title="Google"
              desc={
                googleAccount
                  ? "Your Google account is connected."
                  : "Connect Google for one-tap sign-in."
              }
            >
              {googleAccount ? (
                <form action={disconnectGoogleAction}>
                  <Button
                    type="submit"
                    variant="destructive"
                    className="h-11"
                  >
                    Disconnect Google
                  </Button>
                </form>
              ) : googleConfigured() ? (
                <div className="max-w-xs">
                  <GoogleButton label="Connect Google" next="/me/security" />
                </div>
              ) : (
                <p className="text-sm text-foreground/60">
                  Google sign-in isn&rsquo;t available right now.
                </p>
              )}
            </Section>

            {/* Passkeys ------------------------------------------------- */}
            <Section
              title="Passkeys"
              desc="Sign in with your fingerprint, face, or device PIN. Each device gets its own passkey."
            >
              <PasskeyManager passkeys={passkeyViews} />
            </Section>
          </div>

          <p className="mt-10 text-sm text-foreground/65">
            <Link
              href="/me"
              className="font-semibold text-leaf-deep underline-offset-4 hover:underline"
            >
              ← Back to my shifts
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
  desc,
  children,
}: {
  title: string;
  desc: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-md border border-border bg-card p-6 md:p-7">
      <h2 className="display text-xl font-semibold">{title}</h2>
      <p className="mt-1 mb-4 text-sm text-foreground/70">{desc}</p>
      {children}
    </section>
  );
}

function Banner({
  tone,
  children,
}: {
  tone: "success" | "error";
  children: React.ReactNode;
}) {
  const isError = tone === "error";
  const Icon = isError ? AlertCircle : CheckCircle2;
  return (
    <div
      role={isError ? "alert" : "status"}
      className={`mb-6 flex items-start gap-3 rounded-md border px-5 py-4 ${
        isError
          ? "border-tomato/30 bg-tomato/10 text-tomato"
          : "border-leaf/30 bg-leaf/10 text-leaf-deep"
      }`}
    >
      <Icon className="mt-0.5 size-5 shrink-0" aria-hidden />
      <p className="text-sm font-medium">{children}</p>
    </div>
  );
}
