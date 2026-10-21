"use client"; // Error boundaries must be Client Components

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Fallback for anything that throws inside an /admin page. The sidebar (in
 * the layout above) stays put, so the coordinator can retry or go elsewhere
 * without losing their place. Server error messages are hidden in production
 * — only the digest reaches the client — so the copy stays generic and the
 * digest is shown for matching against the server logs.
 */
export default function AdminError({
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
    <div className="px-6 py-10 md:px-10 md:py-14">
      <div
        role="alert"
        className="mx-auto max-w-xl rounded-md border border-border bg-card p-8 text-center"
      >
        <span
          aria-hidden
          className="mx-auto flex size-12 items-center justify-center rounded-full bg-tomato/10 text-tomato-deep"
        >
          <AlertTriangle className="size-6" />
        </span>
        <h1 className="display mt-4 text-2xl font-bold">
          Something went wrong
        </h1>
        <p className="mt-2 text-pretty text-foreground/70">
          This page couldn&rsquo;t load. Nothing you saved earlier has been
          lost. Try again, and if it keeps happening, let the site
          administrator know.
        </p>
        {error.digest ? (
          <p className="mt-3 font-mono text-xs text-foreground/65">
            Reference: {error.digest}
          </p>
        ) : null}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Button onClick={() => retry()}>
            <RotateCw />
            Try again
          </Button>
          <Button variant="outline" asChild>
            <Link href="/admin">Back to dashboard</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
