"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/site/logo";

// Root error boundary. Renders inside the root layout but replaces the page,
// so it brings its own minimal header (SiteNav is an async Server Component
// and can't render in a client boundary). Plain English — admins land here too.
export default function ErrorPage({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <>
      <header className="border-b border-border/60 bg-background">
        <div className="container-x flex h-16 items-center">
          <Logo size={44} />
        </div>
      </header>
      <main id="main" className="flex-1">
        <div className="container-x py-12 md:py-16">
          <div className="mx-auto max-w-2xl rounded-md border border-border bg-card px-6 py-12 text-center shadow-sm md:px-10 md:py-16">
            <p className="eyebrow">Something went wrong</p>
            <h1 className="display mt-3 text-balance text-4xl font-bold leading-tight md:text-5xl">
              That didn&rsquo;t load properly.
            </h1>
            <p className="mx-auto mt-4 max-w-md text-foreground/70">
              It&rsquo;s on our side, not yours. Give it another go — if it
              keeps happening, email{" "}
              <a
                href="mailto:volunteering@fairfood.org.nz"
                className="font-semibold text-leaf-deep underline underline-offset-4 hover:text-leaf-ink"
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
              <Button
                size="lg"
                className="bg-leaf-deep hover:bg-leaf-ink"
                onClick={() => retry()}
              >
                Try again
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/">Back to the home page</Link>
              </Button>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
