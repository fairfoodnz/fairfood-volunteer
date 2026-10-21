"use client";

import "./globals.css";

// Last-resort boundary for errors in the root layout itself. It replaces the
// whole document, so it ships its own <html>/<body> and stays deliberately
// minimal: no fonts, no data, nothing that could fail a second time.
export default function GlobalError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <html lang="en">
      <body className="flex min-h-dvh items-center justify-center bg-background px-6 py-12 text-foreground antialiased">
        <title>Something went wrong · Fair Food Volunteer</title>
        <main className="w-full max-w-lg rounded-md border border-border bg-card p-8 text-center shadow-sm md:p-10">
          <p className="eyebrow">Fair Food · Volunteer</p>
          <h1 className="display mt-3 text-balance text-3xl font-bold leading-tight md:text-4xl">
            Something went wrong.
          </h1>
          <p className="mt-4 text-foreground/70">
            The site hit a problem loading. Try again in a moment — if it keeps
            happening, email{" "}
            <a
              href="mailto:volunteering@fairfood.org.nz"
              className="font-semibold text-leaf-deep underline underline-offset-4"
            >
              volunteering@fairfood.org.nz
            </a>
            .
          </p>
          {error.digest ? (
            <p className="mt-3 font-mono text-xs text-foreground/65">
              Reference: {error.digest}
            </p>
          ) : null}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => retry()}
              className="inline-flex h-12 items-center rounded-md bg-leaf-deep px-6 text-base font-semibold text-white transition-colors hover:bg-leaf-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              Try again
            </button>
            {/* A plain <a>, not next/link: a full reload is the point here. */}
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a
              href="/"
              className="inline-flex h-12 items-center rounded-md border border-border px-6 text-base font-semibold text-foreground/85 hover:bg-cream-deep"
            >
              Home page
            </a>
          </div>
        </main>
      </body>
    </html>
  );
}
