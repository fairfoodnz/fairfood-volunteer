import Link from "next/link";
import { redirect } from "next/navigation";
import { SignUpForm } from "./form";
import { SiteNav } from "@/components/site/nav";
import { SiteFooter } from "@/components/site/footer";
import { GoogleButton } from "@/components/auth/google-button";
import { AuthDivider } from "@/components/auth/auth-divider";
import { currentUser, safeNextPath } from "@/lib/auth";
import { googleConfigured } from "@/lib/oauth";

export const metadata = {
  title: "Create your account · Fair Food Volunteer",
};

type Props = { searchParams: Promise<{ next?: string }> };

export default async function SignUpPage({ searchParams }: Props) {
  const user = await currentUser();
  const { next } = await searchParams;
  if (user) redirect(safeNextPath(next));
  const showGoogle = googleConfigured();

  return (
    <>
      <SiteNav />
      <main className="flex-1 py-16 md:py-24">
        <div className="container-x grid gap-16 lg:grid-cols-2">
          <div className="max-w-md space-y-6">
            <p className="eyebrow">Nau mai, haere mai</p>
            <h1 className="display text-balance text-4xl font-semibold leading-tight md:text-5xl">
              Create your volunteer account.
            </h1>
            <p className="text-foreground/75">
              Two minutes now, and you&rsquo;ll be ready to book shifts. After
              this we&rsquo;ll ask a few questions so we can roster you safely.
            </p>
            <div className="rounded-md border-l-2 border-leaf bg-cream-deep px-5 py-4 text-sm">
              <p className="font-mono text-[10px] uppercase tracking-widest text-foreground/55">
                Privacy
              </p>
              <p className="mt-1 text-foreground/85">
                We only use your details to roster shifts and look after you on
                the day. Never shared, never sold.
              </p>
            </div>
          </div>

          <div className="relative">
            <div className="rounded-md border border-border bg-card p-7 shadow-sm md:p-9">
              {showGoogle && (
                <>
                  <GoogleButton label="Sign up with Google" next={next} />
                  <AuthDivider label="or with email" />
                </>
              )}
              <SignUpForm next={next} />
            </div>
            <p className="mt-4 text-sm text-foreground/65">
              Already have an account?{" "}
              <Link
                href={next ? `/auth/sign-in?next=${encodeURIComponent(next)}` : "/auth/sign-in"}
                className="font-semibold text-leaf-deep underline-offset-4 hover:underline"
              >
                Sign in →
              </Link>
            </p>
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
