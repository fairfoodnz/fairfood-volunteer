"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useActionState } from "react";
import { Check, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProgramArt } from "@/components/site/illustrations";
import { bookShiftsAction, type BookManyState } from "./actions";
import { blockKindLabel, type BlockSummary } from "@/lib/shifts";

/**
 * Plain (serialisable) shift shape consumed by this client component. The
 * server pre-formats anything that needs locale/timezone awareness so the
 * client never has to re-derive availability or time labels.
 */
export type ShiftCard = {
  id: string;
  whenLabel: string;
  capacity: number;
  free: number;
  isFull: boolean;
  isAlmostFull: boolean;
  notes: string | null;
  bookable: boolean;
  /** Reason the shift can't be ticked (e.g. "Already booked"). */
  unbookableReason: string | null;
  /**
   * Off-platform group holds, summarised by kind. Drives the discreet
   * "Corporate group joining" pill so regulars who'd rather skip a corporate
   * day can see what they're walking into.
   */
  groupBlocks: BlockSummary[];
  program: {
    id: string;
    title: string;
    slug: string;
    imageUrl: string | null;
    imageKey: string | null;
  };
};

export type ShiftDay = { day: string; shifts: ShiftCard[] };

export function ShiftsList({
  groupedShifts,
  initialSelection,
  authed,
  isEmpty,
}: {
  groupedShifts: ShiftDay[];
  initialSelection: string[];
  /** When false, the sticky bar's primary CTA sends them through sign-up. */
  authed: boolean;
  isEmpty: boolean;
}) {
  // Build the set of bookable IDs once so we can intersect with the selection
  // restored from the URL — a stale ?selected= shouldn't keep ticking a shift
  // that has since filled up.
  const bookableIds = useMemo(() => {
    const s = new Set<string>();
    for (const day of groupedShifts) {
      for (const shift of day.shifts) if (shift.bookable) s.add(shift.id);
    }
    return s;
  }, [groupedShifts]);

  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(initialSelection.filter((id) => bookableIds.has(id))),
  );
  const [state, action, pending] = useActionState<BookManyState, FormData>(
    bookShiftsAction,
    {},
  );

  // Map per-shift failure reasons surfaced from the server action.
  const failureReasons = useMemo(() => {
    const m = new Map<string, string>();
    for (const f of state.failures ?? []) m.set(f.shiftId, f.reason);
    return m;
  }, [state.failures]);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function clearSelection() {
    setSelected(new Set());
  }

  const selectedCount = selected.size;
  // Order selected IDs by their position in the listing so the hidden form
  // submission is deterministic — handy for logs and analytics.
  const orderedSelected = useMemo(() => {
    const out: string[] = [];
    for (const day of groupedShifts) {
      for (const s of day.shifts) if (selected.has(s.id)) out.push(s.id);
    }
    return out;
  }, [groupedShifts, selected]);

  // The action submits as a regular form so it works without JS (degrades to
  // the same flow), but we also keep a hidden ref to support a click handler
  // from a non-submit button if we ever need one. Today the sticky bar IS the
  // submit button, so the form is its parent element.
  const formRef = useRef<HTMLFormElement>(null);

  // If a guest tried to book before signing in, the action redirected them
  // through /auth/sign-up?next=…&selected=… → on return we prefill the
  // selection (handled by initialSelection). Scroll into view so they can see
  // what we're about to book.
  useEffect(() => {
    if (initialSelection.length > 0 && bookableIds.size > 0) {
      formRef.current?.scrollIntoView({ block: "center", behavior: "smooth" });
    }
    // Only on first mount — restoring scroll should not re-fire when the user
    // toggles the selection later.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (isEmpty) {
    return (
      <div className="rounded-md border border-dashed border-border bg-card p-10 text-center">
        <h3 className="display text-2xl font-semibold">No shifts match — yet.</h3>
        <p className="mt-2 text-foreground/70">
          Try a different programme, or come back tomorrow when next week opens.
        </p>
      </div>
    );
  }

  return (
    <form ref={formRef} action={action}>
      {orderedSelected.map((id) => (
        <input key={id} type="hidden" name="shiftId" value={id} />
      ))}

      <div className="space-y-12">
        {groupedShifts.map(({ day, shifts }) => (
          <div key={day}>
            <div className="mb-5 flex items-baseline justify-between">
              <h2 className="display text-2xl font-semibold md:text-3xl">{day}</h2>
              <span className="font-mono text-xs uppercase tracking-widest text-foreground/55">
                {shifts.length} shift{shifts.length === 1 ? "" : "s"}
              </span>
            </div>
            <ul className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {shifts.map((s) => (
                <ShiftCardItem
                  key={s.id}
                  shift={s}
                  selected={selected.has(s.id)}
                  onToggle={() => toggle(s.id)}
                  failureReason={failureReasons.get(s.id) ?? null}
                />
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* Spacer so the sticky bar never covers the last card on mobile. */}
      {selectedCount > 0 && <div aria-hidden className="h-28" />}

      {state.error && selectedCount === 0 && (
        <p
          role="alert"
          className="mt-6 rounded-md border border-tomato/30 bg-tomato/10 px-4 py-3 text-sm text-tomato"
        >
          {state.error}
        </p>
      )}

      {selectedCount > 0 && (
        <SelectionBar
          count={selectedCount}
          pending={pending}
          authed={authed}
          selectedIds={orderedSelected}
          onClear={clearSelection}
          error={state.error ?? null}
        />
      )}
    </form>
  );
}

function ShiftCardItem({
  shift,
  selected,
  onToggle,
  failureReason,
}: {
  shift: ShiftCard;
  selected: boolean;
  onToggle: () => void;
  failureReason: string | null;
}) {
  const alreadyBooked = shift.unbookableReason === "Already booked";
  // Card chrome reacts to selection: thicker leaf border + a hard offset shadow
  // in our brand green so a ticked card feels decisively "picked" against the
  // cream backdrop. The hover state mirrors the same idiom at lower intensity.
  const cardOutline = selected
    ? "border-2 border-leaf -translate-y-1 shadow-[0_4px_0_-1px_var(--ff-green)]"
    : "border border-border hover:-translate-y-0.5 hover:border-leaf/40 hover:shadow-md";

  return (
    <li className="relative">
      <Link
        href={`/shifts/${shift.id}`}
        className={`group flex h-full flex-col overflow-hidden rounded-lg bg-card transition-all ${cardOutline}`}
      >
        {/* Hero photograph anchors the card. A subtle bottom gradient keeps the
            top-left status pill readable across whatever the photo carries. */}
        <div className="relative aspect-[5/3] w-full overflow-hidden bg-cream-deep">
          <div
            className={`absolute inset-0 transition-transform duration-500 ${
              selected ? "scale-[1.04]" : "group-hover:scale-[1.02]"
            }`}
          >
            <ProgramArt program={shift.program} />
          </div>
          <div className="pointer-events-none absolute inset-x-0 top-0 h-1/3 bg-gradient-to-b from-black/25 to-transparent" />

          {/* Urgency / status pill — top-left. Only renders when there's a story
              to tell, so bookable-with-plenty-of-room cards stay quiet. */}
          {shift.isFull ? (
            <span className="absolute left-3 top-3 inline-flex items-center rounded-full bg-charcoal/85 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-cream backdrop-blur-sm">
              Full
            </span>
          ) : alreadyBooked ? (
            <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-leaf-deep px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-cream">
              <Check className="h-3 w-3" strokeWidth={3} /> You&rsquo;re going
            </span>
          ) : shift.isAlmostFull ? (
            <span className="absolute left-3 top-3 inline-flex items-center rounded-full bg-tomato px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-cream">
              Almost full
            </span>
          ) : null}

          {/* Selected-state wash over the photo — ties the photo to the card
              chrome so the whole thing reads as "picked". */}
          {selected && (
            <div className="pointer-events-none absolute inset-0 bg-leaf/25 mix-blend-multiply" />
          )}
        </div>

        {/* Body */}
        <div className="flex flex-1 flex-col gap-3 p-5">
          <div>
            <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-leaf-deep">
              {shift.program.title}
            </p>
            <p className="mt-1.5 text-base font-semibold leading-snug text-foreground">
              {shift.whenLabel}
            </p>
          </div>

          {shift.groupBlocks.length > 0 && (
            <ul className="flex flex-wrap gap-1.5">
              {shift.groupBlocks.map((b) => (
                <li
                  key={b.kind}
                  className="inline-flex items-center gap-1 rounded-full border border-clay/30 bg-clay/10 px-2.5 py-0.5 text-[11px] font-semibold text-clay"
                  title={`A ${blockKindLabel(b.kind).toLowerCase()} of ${b.slots} is booked into this shift.`}
                >
                  <Users className="h-3 w-3" strokeWidth={2.5} aria-hidden />
                  <span>
                    {blockKindLabel(b.kind)} of {b.slots} joining
                  </span>
                </li>
              ))}
            </ul>
          )}

          {shift.notes && (
            <p className="text-xs italic text-foreground/65">{shift.notes}</p>
          )}

          {failureReason && (
            <p className="text-xs font-medium text-tomato">{failureReason}</p>
          )}

          {/* Footer: a strong tabular-numeral spot count on the left gives the
              card a hard visual anchor; the action sits opposite on the right. */}
          <div className="mt-auto flex items-end justify-between border-t border-border/60 pt-3">
            <div className="flex items-baseline gap-1.5">
              <span
                className={`font-mono text-[26px] font-bold leading-none tabular-nums ${
                  shift.isAlmostFull
                    ? "text-tomato"
                    : shift.isFull
                      ? "text-foreground/40"
                      : "text-foreground"
                }`}
              >
                {shift.isFull ? 0 : shift.free}
              </span>
              <span className="text-[11px] font-medium uppercase tracking-wider text-foreground/55">
                spot{!shift.isFull && shift.free === 1 ? "" : "s"} left
              </span>
            </div>
            {shift.isFull ? (
              <span className="text-sm font-medium text-foreground/45">View →</span>
            ) : alreadyBooked ? (
              <span className="text-sm font-semibold text-leaf-deep">Details →</span>
            ) : (
              <span className="text-sm font-semibold text-leaf-deep transition-transform group-hover:translate-x-0.5">
                Book →
              </span>
            )}
          </div>
        </div>
      </Link>

      {/* Multi-select control. Sibling of the Link (never nested interactive
          elements). Sized 36×36 with a 2px ring + drop-shadow so it reads on
          any photograph — the "tick me" affordance is the same idiom whether
          the photo behind it is busy or sparse. */}
      {shift.bookable ? (
        <button
          type="button"
          role="checkbox"
          aria-checked={selected}
          aria-label={
            selected ? `Deselect ${shift.program.title}` : `Select ${shift.program.title}`
          }
          onClick={onToggle}
          className={`absolute right-3 top-3 z-10 inline-flex h-9 w-9 items-center justify-center rounded-full border-2 shadow-md transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-leaf focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
            selected
              ? "scale-105 border-cream bg-leaf text-cream"
              : "border-cream bg-cream/95 text-foreground/70 hover:scale-105 hover:bg-leaf hover:text-cream"
          }`}
        >
          <Check
            className={`h-4 w-4 transition-opacity ${
              selected ? "opacity-100" : "opacity-0 group-hover:opacity-60"
            }`}
            strokeWidth={3}
          />
        </button>
      ) : null}
    </li>
  );
}

function SelectionBar({
  count,
  pending,
  authed,
  selectedIds,
  onClear,
  error,
}: {
  count: number;
  pending: boolean;
  authed: boolean;
  selectedIds: string[];
  onClear: () => void;
  error: string | null;
}) {
  // For guests, "Book selected" should send them through sign-up first, then
  // bounce them back to /shifts with the same selection. The server action
  // does this too (it redirects to sign-up), but linking directly avoids the
  // round-trip flash for the no-JS / first-click case.
  const signInHref = `/auth/sign-up?next=${encodeURIComponent(
    `/shifts?selected=${selectedIds.join(",")}`,
  )}`;

  return (
    <div
      role="region"
      aria-label="Selected shifts"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/80"
      style={{ paddingBottom: "max(env(safe-area-inset-bottom), 0.75rem)" }}
    >
      <div className="container-x flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 flex-col">
          <p className="font-semibold text-foreground">
            {count} shift{count === 1 ? "" : "s"} selected
          </p>
          {error ? (
            <p role="alert" className="text-xs text-tomato">
              {error}
            </p>
          ) : (
            <p className="text-xs text-foreground/65">
              {authed
                ? "We'll email you a confirmation for each one."
                : "We'll set you up in two minutes and book them all."}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            onClick={onClear}
            disabled={pending}
            className="h-11"
          >
            Clear
          </Button>
          {authed ? (
            <Button
              type="submit"
              disabled={pending}
              className="h-11 bg-leaf px-5 text-base font-semibold hover:bg-leaf-deep"
            >
              {pending ? "Booking…" : `Book ${count > 1 ? "all" : "shift"} →`}
            </Button>
          ) : (
            <Button
              asChild
              className="h-11 bg-leaf px-5 text-base font-semibold hover:bg-leaf-deep"
            >
              <Link href={signInHref}>
                Sign up &amp; book {count > 1 ? "all" : ""}→
              </Link>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
