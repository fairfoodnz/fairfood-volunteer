import Link from "next/link";
import { redirect } from "next/navigation";
import { ForgotPasswordForm } from "./form";
import { SiteNav } from "@/components/site/nav";
import { SiteFooter } from "@/components/site/footer";
import { currentUser } from "@/lib/auth";

export const metadata = {
  title: "Reset your password · Fair Food Volunteer",
};

export default async function ForgotPasswordPage() {
  const user = await currentUser();
  if (user) redirect("/me");

  return (
    <>
      <SiteNav />
      <main className="flex-1 py-16 md:py-24">
        <div className="container-x grid gap-16 lg:grid-cols-2">
          <div className="max-w-md space-y-6">
            <p className="eyebrow">Kia ora — let&rsquo;s get you back in</p>
            <h1 className="display text-balance text-4xl font-semibold leading-tight md:text-5xl">
              Forgot your password?
            </h1>
            <p className="text-foreground/75">
              No worries — it happens. Pop in the email you signed up with and
              we&rsquo;ll send you a link to set a new one. Just like the kai we
              rescue, your account doesn&rsquo;t have to go to waste.
            </p>
          </div>

          <div className="relative">
            <div className="rounded-md border border-border bg-card p-7 shadow-sm md:p-9">
              <ForgotPasswordForm />
            </div>
            <p className="mt-4 text-sm text-foreground/65">
              Remembered it?{" "}
              <Link
                href="/auth/sign-in"
                className="font-semibold text-leaf-deep underline-offset-4 hover:underline"
              >
                Back to sign in →
              </Link>
            </p>
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
