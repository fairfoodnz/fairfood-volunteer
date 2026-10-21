"use client";

import { cn } from "@/lib/utils";

// The admin filter controls, shared by the Needs-review toolbar and the
// Volunteers filters so the two pages look and behave the same: a
// `role="group"` of `aria-pressed` buttons that write straight to the URL.

/** Mono micro-label above a filter control. Pass `htmlFor` for a real <label>. */
export function FilterLabel({
  htmlFor,
  id,
  children,
}: {
  htmlFor?: string;
  id?: string;
  children: React.ReactNode;
}) {
  const className =
    "font-mono text-[10px] uppercase tracking-widest text-foreground/70";
  return htmlFor ? (
    <label htmlFor={htmlFor} id={id} className={className}>
      {children}
    </label>
  ) : (
    <span id={id} className={className}>
      {children}
    </span>
  );
}

export function SegmentGroup({
  label,
  labelledBy,
  children,
}: {
  /** Accessible name; use `labelledBy` instead when a visible label exists. */
  label?: string;
  labelledBy?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      role="group"
      aria-label={labelledBy ? undefined : label}
      aria-labelledby={labelledBy}
      className="inline-flex w-fit flex-wrap items-center gap-0.5 rounded-lg border border-border bg-card p-0.5"
    >
      {children}
    </div>
  );
}

export function SegmentButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "inline-flex h-9 items-center rounded-md px-3 text-xs font-semibold outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/40",
        active
          ? "bg-forest text-cream shadow-sm"
          : "text-foreground/70 hover:bg-cream-deep/60 hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

/** Live count inside a segment, toned for the active/idle state. */
export function SegmentCount({
  active,
  children,
}: {
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "ml-1.5 tabular-nums",
        active ? "text-cream/85" : "text-foreground/65",
      )}
    >
      {children}
    </span>
  );
}

export const SEARCH_INPUT_CLASS =
  "h-10 w-full rounded-lg border border-border bg-card pl-9 pr-9 text-sm outline-none transition-colors placeholder:text-foreground/65 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40 [&::-webkit-search-cancel-button]:hidden";

export const SELECT_CLASS =
  "h-10 rounded-lg border border-border bg-card px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40";
