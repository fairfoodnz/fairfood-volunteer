"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

/**
 * Copies an app-relative path as an absolute URL. Used for unlisted programmes,
 * where the link *is* the access control — the coordinator needs to hand it to
 * a group, so it has to be one click away from the pages that mention it.
 *
 * The origin is read from the browser at click time rather than rendered into
 * the markup: no hydration mismatch between NEXT_PUBLIC_APP_URL and whatever
 * host the coordinator is actually on.
 */
export function CopyLinkButton({
  path,
  label = "Copy link",
  className,
}: {
  path: string;
  label?: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}${path}`);
      setCopied(true);
      toast.success("Link copied to your clipboard.");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Couldn't copy — select the link and copy it manually.");
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      className={cn(
        "inline-flex h-8 items-center gap-1.5 rounded border border-border bg-card px-2.5 text-xs font-semibold text-foreground/75 transition-colors hover:border-leaf hover:text-leaf-deep",
        className,
      )}
    >
      {copied ? (
        <Check aria-hidden className="size-3.5 text-leaf-deep" />
      ) : (
        <Copy aria-hidden className="size-3.5" />
      )}
      {copied ? "Copied" : label}
    </button>
  );
}
