import Link from "next/link";
import { VerifyEmailForm, ResendBlock } from "./form";
import { SiteNav } from "@/components/site/nav";
import { SiteFooter } from "@/components/site/footer";

export const metadata = {
  title: "Verify your email · Fair Food Volunteer",
};

type Props = { searchParams: Promise<{ token?: string }> };

// Deliberately NOT gated on currentUser: the link is often opened on a
// different device (phone) where there's no session yet — the token alone
// proves inbox control. Verification happens via a POST (the button), never
// on GET, so link-scanning mail filters can't silently burn the token.
export default async function VerifyEmailPage({ searchParams }: Props) {
  const { token } = await searchParams;

  return (
    <>
      <SiteNav />
      <main className="flex-1 py-16 md:py-24">
        <div className="container-x grid gap-16 lg:grid-cols-2">
          <div className="max-w-md space-y-6">
            <p className="eyebrow">Almost there</p>
            <h1 className="display text-balance text-4xl font-semibold leading-tight md:text-5xl">
              Confirm your email.
            </h1>
            <p className="text-foreground/75">
              One quick tap and you&rsquo;re verified — then you can book your
              first shift at the kai table. We&rsquo;ll only ever use your email
              for shift reminders and roster updates.
            </p>
          </div>

          <div className="relative">
            <div className="rounded-md border border-border bg-card p-7 shadow-sm md:p-9">
              {token ? (
                <VerifyEmailForm token={token} />
              ) : (
                <div className="space-y-3">
                  <p className="text-sm font-semibold text-destructive">
                    This verification link is incomplete
                  </p>
                  <p className="text-sm text-foreground/75">
                    The link you followed is missing its security token — some
                    email apps wrap or truncate long links. Sign in and we can
                    send you a fresh one.
                  </p>
                  <ResendBlock />
                </div>
              )}
            </div>
            <p className="mt-4 text-sm text-foreground/65">
              Back to{" "}
              <Link
                href="/auth/sign-in"
                className="font-semibold text-leaf-deep underline-offset-4 hover:underline"
              >
                sign in
              </Link>
            </p>
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
