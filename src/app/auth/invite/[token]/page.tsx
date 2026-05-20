import Link from "next/link";
import { redirect } from "next/navigation";
import { SiteNav } from "@/components/site/nav";
import { SiteFooter } from "@/components/site/footer";
import { currentUser } from "@/lib/auth";
import { findInviteByToken } from "@/app/auth/actions";
import { fullName } from "@/lib/users";
import { ClaimInviteForm } from "./form";

export const metadata = {
  title: "Claim your account · Fair Food Volunteer",
};

// Tokens are random hex — neither cacheable across users nor safe to ISR.
export const dynamic = "force-dynamic";

type Props = { params: Promise<{ token: string }> };

export default async function ClaimInvitePage({ params }: Props) {
  // An already-signed-in user clicking an invite link is almost certainly a
  // mistake or a forwarded email — drop them on /me rather than redeeming on
  // behalf of someone else's account.
  const me = await currentUser();
  if (me) redirect("/me");

  const { token } = await params;
  const invite = await findInviteByToken(token);

  return (
    <>
      <SiteNav />
      <main className="flex-1 py-16 md:py-24">
        <div className="container-x grid gap-16 lg:grid-cols-2">
          <div className="max-w-md space-y-6">
            <p className="eyebrow">Welcome</p>
            <h1 className="display text-balance text-4xl font-semibold leading-tight md:text-5xl">
              {invite ? (
                <>
                  Kia ora{invite.user.firstName ? ` ${invite.user.firstName}` : ""} —
                  let&rsquo;s get you in.
                </>
              ) : (
                <>This invite isn&rsquo;t live anymore.</>
              )}
            </h1>
            <p className="text-foreground/75">
              {invite ? (
                <>
                  Your coordinator&rsquo;s already added your details. Choose a
                  password and we&rsquo;ll sign you straight in so you can pick
                  your first shift.
                </>
              ) : (
                <>
                  The link you followed has expired or been used. Ask your
                  coordinator for a fresh invite, or sign in if you&rsquo;ve
                  already set up your password.
                </>
              )}
            </p>
            {invite ? (
              <div className="rounded-md border border-border bg-cream-deep/40 p-4 text-sm">
                <p className="font-mono text-[10px] uppercase tracking-widest text-foreground/55">
                  Signing in as
                </p>
                <p className="mt-1.5 font-semibold">{fullName(invite.user)}</p>
                <p className="text-foreground/75">{invite.user.email}</p>
                <p className="mt-2 text-xs text-foreground/55">
                  Not you?{" "}
                  <Link
                    href="/auth/sign-in"
                    className="font-semibold text-leaf-deep underline-offset-4 hover:underline"
                  >
                    Sign in with a different account
                  </Link>
                </p>
              </div>
            ) : null}
          </div>

          <div className="relative">
            <div className="rounded-md border border-border bg-card p-7 shadow-sm md:p-9">
              {invite ? (
                <ClaimInviteForm token={token} firstName={invite.user.firstName} />
              ) : (
                <div className="space-y-3">
                  <p className="text-sm font-semibold text-destructive">
                    Link no longer valid
                  </p>
                  <p className="text-sm text-foreground/75">
                    Invite links last 7 days, and each one can only be used
                    once. If you&rsquo;ve already signed up, head straight to
                    sign-in below.
                  </p>
                  <div className="flex flex-col gap-2 pt-2">
                    <Link
                      href="/auth/sign-in"
                      className="inline-block text-sm font-semibold text-leaf-deep underline-offset-4 hover:underline"
                    >
                      Sign in →
                    </Link>
                    <Link
                      href="/auth/forgot-password"
                      className="inline-block text-sm font-semibold text-leaf-deep underline-offset-4 hover:underline"
                    >
                      Reset your password →
                    </Link>
                  </div>
                </div>
              )}
            </div>
            {invite ? (
              <p className="mt-4 text-sm text-foreground/65">
                Already have a password?{" "}
                <Link
                  href="/auth/sign-in"
                  className="font-semibold text-leaf-deep underline-offset-4 hover:underline"
                >
                  Sign in
                </Link>
              </p>
            ) : null}
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
