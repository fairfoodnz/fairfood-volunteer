import Link from "next/link";
import { redirect } from "next/navigation";
import { ResetPasswordForm } from "./form";
import { SiteNav } from "@/components/site/nav";
import { SiteFooter } from "@/components/site/footer";
import { currentUser } from "@/lib/auth";

export const metadata = {
  title: "Choose a new password · Fair Food Volunteer",
};

type Props = { searchParams: Promise<{ token?: string }> };

export default async function ResetPasswordPage({ searchParams }: Props) {
  const user = await currentUser();
  if (user) redirect("/me");
  const { token } = await searchParams;

  return (
    <>
      <SiteNav />
      <main className="flex-1 py-16 md:py-24">
        <div className="container-x grid gap-16 lg:grid-cols-2">
          <div className="max-w-md space-y-6">
            <p className="eyebrow">Almost there</p>
            <h1 className="display text-balance text-4xl font-semibold leading-tight md:text-5xl">
              Choose a new password.
            </h1>
            <p className="text-foreground/75">
              Pick something you&rsquo;ll remember. Once it&rsquo;s set
              we&rsquo;ll sign you straight in and you&rsquo;re back to booking
              shifts.
            </p>
          </div>

          <div className="relative">
            <div className="rounded-md border border-border bg-card p-7 shadow-sm md:p-9">
              {token ? (
                <ResetPasswordForm token={token} />
              ) : (
                <div className="space-y-3">
                  <p className="text-sm font-semibold text-destructive">
                    This reset link is incomplete
                  </p>
                  <p className="text-sm text-foreground/75">
                    The link you followed is missing its security token. Please
                    request a fresh one.
                  </p>
                  <Link
                    href="/auth/forgot-password"
                    className="inline-block text-sm font-semibold text-leaf-deep underline-offset-4 hover:underline"
                  >
                    Request a new link →
                  </Link>
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
