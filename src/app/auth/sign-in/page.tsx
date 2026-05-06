import Link from "next/link";
import { redirect } from "next/navigation";
import { SignInForm } from "./form";
import { SiteNav } from "@/components/site/nav";
import { SiteFooter } from "@/components/site/footer";
import { currentUser } from "@/lib/auth";

export const metadata = {
  title: "Sign in · Fair Food Volunteer",
};

type Props = { searchParams: Promise<{ next?: string; error?: string }> };

export default async function SignInPage({ searchParams }: Props) {
  const user = await currentUser();
  const { next, error } = await searchParams;
  if (user) redirect(next || "/me");

  return (
    <>
      <SiteNav />
      <main className="flex-1 py-16 md:py-24">
        <div className="container-x grid gap-16 lg:grid-cols-2">
          <div className="max-w-md space-y-6">
            <p className="eyebrow">Kia ora — welcome back</p>
            <h1 className="display text-balance text-4xl font-semibold leading-tight md:text-5xl">
              Sign in to manage your shifts.
            </h1>
            <p className="text-foreground/75">
              We use email magic links — no password to remember. Pop in the
              email you used to sign up, and we&rsquo;ll send a one-tap link.
            </p>
            <ul className="mt-6 space-y-3 text-sm text-foreground/70">
              <li className="flex gap-3">
                <Dot />
                Book shifts in seconds and view them on one page
              </li>
              <li className="flex gap-3">
                <Dot />
                Cancel up to 12 hours before so we can reoffer your spot
              </li>
              <li className="flex gap-3">
                <Dot />
                Get gentle reminders the day before
              </li>
            </ul>
          </div>

          <div className="relative">
            {error === "expired" && (
              <div className="mb-4 rounded-md border border-tomato/30 bg-tomato/10 px-4 py-3 text-sm text-tomato">
                That magic link didn&rsquo;t work — they expire after 15
                minutes and can only be used once. Request a fresh one.
              </div>
            )}
            <div className="rounded-md border border-border bg-card p-7 shadow-sm md:p-9">
              <SignInForm next={next} />
            </div>
            <p className="mt-4 text-sm text-foreground/65">
              First time?{" "}
              <Link
                href="/shifts"
                className="font-semibold text-leaf-deep underline-offset-4 hover:underline"
              >
                Browse shifts and sign up at the same time →
              </Link>
            </p>
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}

function Dot() {
  return (
    <span
      aria-hidden
      className="mt-1.5 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-leaf"
    />
  );
}
