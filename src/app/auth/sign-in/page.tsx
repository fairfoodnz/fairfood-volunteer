import Link from "next/link";
import { redirect } from "next/navigation";
import { SignInForm } from "./form";
import { SiteNav } from "@/components/site/nav";
import { SiteFooter } from "@/components/site/footer";
import { currentUser } from "@/lib/auth";
import { devSignInAction } from "../actions";

export const metadata = {
  title: "Sign in · Fair Food Volunteer",
};

type Props = { searchParams: Promise<{ next?: string }> };

export default async function SignInPage({ searchParams }: Props) {
  const user = await currentUser();
  const { next } = await searchParams;
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
              Use the email and password you set when you signed up. We&rsquo;ll
              remember you on this device.
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
            <div className="rounded-md border border-border bg-card p-7 shadow-sm md:p-9">
              <SignInForm next={next} />
            </div>
            <p className="mt-4 text-sm text-foreground/65">
              First time?{" "}
              <Link
                href={next ? `/auth/sign-up?next=${encodeURIComponent(next)}` : "/auth/sign-up"}
                className="font-semibold text-leaf-deep underline-offset-4 hover:underline"
              >
                Create your volunteer account →
              </Link>
            </p>
            <DevQuickLogin />
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

function DevQuickLogin() {
  return (
    <div className="mt-6 rounded-md border border-dashed border-leaf/40 bg-leaf/5 p-4">
      <p className="font-mono text-[10px] uppercase tracking-widest text-foreground/55">
        Dev only — seed accounts
      </p>
      <p className="mt-1 text-xs text-foreground/65">
        Skip the form and jump in as one of the seeded users.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <form action={devSignInAction}>
          <input type="hidden" name="role" value="volunteer" />
          <button
            type="submit"
            className="inline-flex h-9 items-center rounded border border-leaf/40 bg-card px-3 text-xs font-semibold text-leaf-deep transition-colors hover:bg-leaf hover:text-cream"
          >
            Sign in as volunteer
          </button>
        </form>
        <form action={devSignInAction}>
          <input type="hidden" name="role" value="admin" />
          <button
            type="submit"
            className="inline-flex h-9 items-center rounded border border-charcoal/30 bg-card px-3 text-xs font-semibold text-charcoal transition-colors hover:bg-charcoal hover:text-cream"
          >
            Sign in as admin
          </button>
        </form>
      </div>
    </div>
  );
}
