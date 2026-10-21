import Link from "next/link";
import type { Metadata } from "next";
import { SiteNav } from "@/components/site/nav";
import { SiteFooter } from "@/components/site/footer";

export const metadata: Metadata = {
  title: "Page not found · Fair Food Volunteer",
};

// Root 404: unmatched URLs plus every notFound() that no nearer segment
// catches (hidden programmes, shifts you can't see). Next adds noindex itself.
export default function NotFound() {
  return (
    <>
      <SiteNav />
      <main id="main" className="flex-1">
        <div className="container-x py-12 md:py-16">
          <div className="mx-auto max-w-2xl rounded-md border border-dashed border-border bg-card px-6 py-12 text-center md:px-10 md:py-16">
            <p className="eyebrow">404 · Page not found</p>
            <h1 className="display mt-3 text-balance text-4xl font-bold leading-tight md:text-5xl">
              We couldn&rsquo;t find that page.
            </h1>
            <p className="mx-auto mt-4 max-w-md text-foreground/70">
              The link may be old, or the shift or programme it pointed to is
              no longer listed. There&rsquo;s plenty else on, though.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-x-8 gap-y-2 sm:flex-row">
              <Link
                href="/shifts"
                className="inline-flex min-h-11 items-center font-semibold text-leaf-deep underline-offset-4 hover:text-leaf-ink hover:underline"
              >
                Browse open shifts →
              </Link>
              <Link
                href="/"
                className="inline-flex min-h-11 items-center font-semibold text-foreground/85 underline-offset-4 hover:text-foreground hover:underline"
              >
                Back to the home page
              </Link>
            </div>
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
