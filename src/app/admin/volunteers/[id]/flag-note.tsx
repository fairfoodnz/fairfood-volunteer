"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { ChevronDown, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { revealFlagAction, type FlagDisclosure } from "../../flagged/actions";
import { Disclosure } from "../../flagged/flagged-row";

/**
 * The profile's view of a questionnaire flag. Same privacy rule as Needs
 * review: what they disclosed isn't in the page at all until a coordinator
 * asks for it, and "Hide" drops it from the DOM again.
 */
export function FlagNote({
  userId,
  reviewedLabel,
  queueHref,
}: {
  userId: string;
  /** "Reviewed 4 May 2026", or null while it's still in the queue. */
  reviewedLabel: string | null;
  queueHref: string;
}) {
  const [disclosure, setDisclosure] = useState<FlagDisclosure | null>(null);
  const [isRevealing, startReveal] = useTransition();
  const open = disclosure !== null;
  const panelId = `profile-flag-${userId}`;

  const toggle = () => {
    if (open) {
      setDisclosure(null);
      return;
    }
    startReveal(async () => {
      try {
        const result = await revealFlagAction(userId);
        if (!result) {
          toast.error("That volunteer no longer exists.");
          return;
        }
        setDisclosure(result);
      } catch {
        toast.error("Couldn't load their notes. Try again.");
      }
    });
  };

  return (
    <div className="mt-6 border-t border-border pt-5">
      <p className="font-mono text-[10px] uppercase tracking-widest text-foreground/70">
        Flagged on questionnaire
      </p>
      <p className="mt-1.5 text-sm text-foreground/85">
        They answered yes to a sensitive question.{" "}
        {reviewedLabel ? `${reviewedLabel}.` : "Not reviewed yet."}
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
        <button
          type="button"
          onClick={toggle}
          disabled={isRevealing}
          aria-expanded={open}
          aria-controls={panelId}
          className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border bg-card px-3 text-xs font-semibold text-foreground/85 outline-none transition-colors hover:border-leaf/50 hover:text-leaf-deep focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40 disabled:opacity-60"
        >
          {isRevealing ? (
            <>
              <Loader2 aria-hidden className="size-3.5 motion-safe:animate-spin" />
              Revealing…
            </>
          ) : (
            <>
              {open ? "Hide what they shared" : "Reveal what they shared"}
              <ChevronDown
                aria-hidden
                className={cn(
                  "size-3.5 transition-transform duration-200",
                  open && "rotate-180",
                )}
              />
            </>
          )}
        </button>
        <Link
          href={queueHref}
          className="inline-flex min-h-9 items-center text-xs font-semibold text-leaf-deep underline-offset-4 hover:underline"
        >
          Open in Needs review →
        </Link>
      </div>

      {disclosure && (
        <div id={panelId} className="mt-4 space-y-3">
          {disclosure.arrestDetails !== null && (
            <Disclosure label="Arrest history" details={disclosure.arrestDetails} />
          )}
          {disclosure.healthDetails !== null && (
            <Disclosure label="Health conditions" details={disclosure.healthDetails} />
          )}
        </div>
      )}
    </div>
  );
}
