"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  CalendarDays,
  Check,
  ChevronDown,
  Loader2,
  Mail,
  Phone,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  revealFlagAction,
  setFlagReviewedAction,
  type FlagDisclosure,
} from "./actions";

export type FlaggedRowData = {
  id: string;
  // First name + last initial. The full name only arrives with the reveal.
  shortName: string;
  initials: string;
  arrest: boolean;
  health: boolean;
  firstTimer: boolean;
  flaggedLabel: string;
  reviewedLabel: string | null;
  nextShift: {
    id: string;
    whenLabel: string;
    programme: string;
    countdown: string;
    // Today or tomorrow - the chat can't wait.
    imminent: boolean;
  } | null;
};

const CLOCK = new Intl.DateTimeFormat("en-NZ", {
  hour: "numeric",
  minute: "2-digit",
  timeZone: "Pacific/Auckland",
});

const MONO_LABEL =
  "font-mono text-[10px] uppercase tracking-widest text-foreground/55";

export function FlaggedRow({ person }: { person: FlaggedRowData }) {
  const [disclosure, setDisclosure] = useState<FlagDisclosure | null>(null);
  const [revealedAt, setRevealedAt] = useState<string | null>(null);
  const [isRevealing, startReveal] = useTransition();
  const [isSaving, startSave] = useTransition();

  const open = disclosure !== null;
  const reviewed = person.reviewedLabel !== null;
  const panelId = `flag-${person.id}`;

  const toggle = () => {
    if (open) {
      // Drop it from the DOM entirely, not just hide it.
      setDisclosure(null);
      return;
    }
    startReveal(async () => {
      try {
        const result = await revealFlagAction(person.id);
        if (!result) {
          toast.error("That volunteer no longer exists.");
          return;
        }
        setDisclosure(result);
        setRevealedAt(CLOCK.format(new Date()));
      } catch {
        toast.error("Couldn't load their notes. Try again.");
      }
    });
  };

  const setReviewed = (next: boolean) => {
    startSave(async () => {
      try {
        await setFlagReviewedAction(person.id, next);
        toast.success(
          next
            ? `${person.shortName} marked as reviewed.`
            : `${person.shortName} moved back to review.`,
          {
            action: {
              label: "Undo",
              onClick: () => {
                setFlagReviewedAction(person.id, !next).catch(() =>
                  toast.error("Couldn't undo that. Try again."),
                );
              },
            },
          },
        );
      } catch {
        toast.error("Couldn't save that. Try again.");
      }
    });
  };

  return (
    <li
      className={cn(
        "relative transition-colors",
        open ? "bg-cream/60" : "hover:bg-cream/40",
      )}
    >
      {/* Open rows carry a leaf rule so the eye can find its way back. */}
      <span
        aria-hidden
        className={cn(
          "absolute inset-y-0 left-0 w-0.5 bg-leaf transition-opacity",
          open ? "opacity-100" : "opacity-0",
        )}
      />

      <div className="grid items-center gap-x-6 gap-y-3 px-4 py-4 sm:px-5 md:grid-cols-[minmax(0,1.15fr)_minmax(0,1.35fr)_auto]">
        <div className="flex min-w-0 items-center gap-3">
          <span
            aria-hidden
            className={cn(
              "flex size-10 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
              reviewed
                ? "bg-leaf/15 text-leaf-deep"
                : "bg-cream-deep text-foreground/75",
            )}
          >
            {reviewed ? <Check className="size-4" /> : person.initials}
          </span>
          <div className="min-w-0">
            <p className="flex flex-wrap items-center gap-x-2 gap-y-1 font-semibold leading-tight">
              <span className="truncate">
                {disclosure?.fullName ?? person.shortName}
              </span>
              {person.firstTimer && (
                <span className="rounded-full bg-leaf/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-leaf-deep">
                  First shift
                </span>
              )}
            </p>
            <p className="mt-1.5 flex flex-wrap items-center gap-1.5">
              {person.arrest && <TypeChip>Arrest history</TypeChip>}
              {person.health && <TypeChip>Health</TypeChip>}
            </p>
          </div>
        </div>

        <div className="min-w-0 text-sm">
          {person.nextShift ? (
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums",
                  person.nextShift.imminent
                    ? "bg-forest text-cream"
                    : "bg-foreground/10 text-foreground/70",
                )}
              >
                {person.nextShift.countdown}
              </span>
              <span className="text-foreground/85">{person.nextShift.whenLabel}</span>
              <span className="truncate text-foreground/60">
                {person.nextShift.programme}
              </span>
            </div>
          ) : (
            <p className="text-foreground/55">No shift booked</p>
          )}
          <p className="mt-1 text-xs text-foreground/55">
            {reviewed
              ? `Reviewed ${person.reviewedLabel}`
              : `Flagged ${person.flaggedLabel}`}
          </p>
        </div>

        <button
          type="button"
          onClick={toggle}
          disabled={isRevealing}
          aria-expanded={open}
          aria-controls={panelId}
          className={cn(
            "inline-flex h-10 w-full items-center justify-center gap-1.5 whitespace-nowrap rounded-lg border px-3.5 text-xs font-semibold outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40 disabled:opacity-60 md:w-36",
            open
              ? "border-leaf/50 bg-card text-leaf-deep"
              : "border-border bg-card text-foreground/80 hover:border-leaf/50 hover:text-leaf-deep",
          )}
        >
          {isRevealing ? (
            <>
              <Loader2 className="size-3.5 motion-safe:animate-spin" />
              Revealing…
            </>
          ) : (
            <>
              {open ? "Hide notes" : "Reveal notes"}
              <ChevronDown
                className={cn(
                  "size-3.5 transition-transform duration-200",
                  open && "rotate-180",
                )}
              />
            </>
          )}
        </button>
      </div>

      {disclosure && (
        <div
          id={panelId}
          className="px-4 pb-5 sm:px-5 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-top-1 motion-safe:duration-200"
        >
          <div className="grid gap-6 border-t border-border pt-5 md:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)]">
            <div>
              <p className={MONO_LABEL}>Get in touch</p>
              <ul className="mt-2 space-y-1.5 text-sm">
                <li>
                  <a
                    href={`mailto:${disclosure.email}`}
                    className="inline-flex max-w-full items-center gap-2 text-foreground/85 underline-offset-4 hover:text-leaf-deep hover:underline"
                  >
                    <Mail className="size-3.5 shrink-0 text-foreground/50" />
                    <span className="truncate">{disclosure.email}</span>
                  </a>
                </li>
                {disclosure.phone && (
                  <li>
                    <a
                      href={`tel:${disclosure.phone.replace(/\s+/g, "")}`}
                      className="inline-flex items-center gap-2 text-foreground/85 underline-offset-4 hover:text-leaf-deep hover:underline"
                    >
                      <Phone className="size-3.5 shrink-0 text-foreground/50" />
                      {disclosure.phone}
                    </a>
                  </li>
                )}
                {person.nextShift && (
                  <li>
                    <Link
                      href={`/admin/shifts/${person.nextShift.id}`}
                      className="inline-flex items-center gap-2 text-foreground/85 underline-offset-4 hover:text-leaf-deep hover:underline"
                    >
                      <CalendarDays className="size-3.5 shrink-0 text-foreground/50" />
                      Open their next shift
                    </Link>
                  </li>
                )}
              </ul>
              <Link
                href={`/admin/volunteers/${person.id}`}
                className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-leaf-deep underline-offset-4 hover:underline"
              >
                Full volunteer profile
                <ArrowUpRight className="size-3.5" />
              </Link>
            </div>

            <div className="space-y-3">
              {disclosure.arrestDetails !== null && (
                <Disclosure label="Arrest history" details={disclosure.arrestDetails} />
              )}
              {disclosure.healthDetails !== null && (
                <Disclosure label="Health conditions" details={disclosure.healthDetails} />
              )}
            </div>
          </div>

          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="font-mono text-[10px] uppercase tracking-widest text-foreground/50">
              Revealed by you · {revealedAt}
            </p>
            <button
              type="button"
              onClick={() => setReviewed(!reviewed)}
              disabled={isSaving}
              className={cn(
                "inline-flex h-10 items-center justify-center gap-1.5 rounded-lg px-4 text-xs font-semibold outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/40 disabled:opacity-60",
                reviewed
                  ? "border border-border bg-card text-foreground/80 hover:border-leaf/50 hover:text-leaf-deep"
                  : "bg-leaf-deep text-cream hover:bg-forest",
              )}
            >
              {isSaving ? (
                <Loader2 className="size-3.5 motion-safe:animate-spin" />
              ) : (
                !reviewed && <Check className="size-3.5" />
              )}
              {reviewed ? "Move back to review" : "Mark as reviewed"}
            </button>
          </div>
        </div>
      )}
    </li>
  );
}

function TypeChip({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded border border-border bg-card px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-foreground/65">
      {children}
    </span>
  );
}

function Disclosure({ label, details }: { label: string; details: string }) {
  return (
    <div className="rounded-md border-l-2 border-leaf bg-cream-deep px-4 py-3">
      <p className={MONO_LABEL}>{label} · what they shared</p>
      <p className="mt-1.5 whitespace-pre-wrap text-sm text-foreground/85">
        {details.length > 0
          ? details
          : "Answered yes but left the details blank - worth following up."}
      </p>
    </div>
  );
}
