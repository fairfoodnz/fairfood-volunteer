"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useActionState } from "react";
import { Check, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/patterns/status-pill";
import { FirstTimeCheckbox } from "@/components/site/first-time-checkbox";
import { bookShiftsAction, type BookManyState } from "./actions";
import { blockKindLabel, type BlockSummary } from "@/lib/shifts";
import { programmeImageSrc } from "@/lib/programs";
import { programmeTheme } from "@/lib/programme-theme";
import { countOf } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * Plain (serialisable) shift shape consumed by this client component. The
 * server pre-formats anything that needs locale/timezone awareness so the
 * client never has to re-derive availability or time labels.
 */
export type ShiftCard = {
  id: string;
  /** Full NZ date + time range, e.g. "Tue, 4 Nov · 9:00 am – 12:00 pm". */
  whenLabel: string;
  /** Times only, for the compact phone card under its day heading. */
  timeLabel: string;
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
    /** Card theme key — colours the fallback art when there's no photo. */
    theme: string;
  };
};

/** One NZ calendar day. `key` is "YYYY-MM-DD". */
export type ShiftDay = { key: string; day: string; shifts: ShiftCard[] };

/** One Monday-start NZ week ("This week", "Next week", "Week of 17 Nov"). */
export type ShiftWeek = {
  key: string;
  label: string;
  count: number;
  days: ShiftDay[];
};

export function ShiftsList({
  weeks,
  initialSelection,
  authed,
  firstTimePrompt,
}: {
  weeks: ShiftWeek[];
  initialSelection: string[];
  /** When false, the sticky bar's primary CTA sends them through sign-up. */
  authed: boolean;
  /**
   * Label for the "first time here" tick box in the selection bar, or null
   * when we already know the answer (see lib/first-time.ts).
   */
  firstTimePrompt: string | null;
}) {
  const allShifts = useMemo(
    () => weeks.flatMap((w) => w.days.flatMap((d) => d.shifts)),
    [weeks],
  );

  // Build the set of bookable IDs once so we can intersect with the selection
  // restored from the URL — a stale ?selected= shouldn't keep ticking a shift
  // that has since filled up.
  const bookableIds = useMemo(
    () => new Set(allShifts.filter((s) => s.bookable).map((s) => s.id)),
    [allShifts],
  );

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
  const orderedSelected = useMemo(
    () => allShifts.filter((s) => selected.has(s.id)).map((s) => s.id),
    [allShifts, selected],
  );

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
      const reduce = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;
      formRef.current?.scrollIntoView({
        block: "center",
        behavior: reduce ? "auto" : "smooth",
      });
    }
    // Only on first mount — restoring scroll should not re-fire when the user
    // toggles the selection later.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      {/* Week jumps: a long roster is ~40 cards, so let people skip straight
          to the week they're planning. Sticks under the site nav (h-16). */}
      {weeks.length > 1 && (
        <nav
          aria-label="Jump to week"
          className="sticky top-16 z-20 -mx-6 mb-8 border-b border-border/60 bg-background/95 px-6 py-2 backdrop-blur supports-[backdrop-filter]:bg-background/85 md:-mx-10 md:px-10"
        >
          <ul className="relative -mx-1 flex gap-2 overflow-x-auto px-1 py-1">
            {weeks.map((w) => (
              <li key={w.key} className="shrink-0">
                <a
                  href={`#week-${w.key}`}
                  className="inline-flex min-h-11 items-center gap-2 whitespace-nowrap rounded border border-foreground/15 bg-card px-3 text-sm font-medium text-foreground/85 transition-colors hover:border-leaf-deep hover:text-leaf-deep"
                >
                  {w.label}
                  <span className="font-mono text-xs tabular-nums text-foreground/65">
                    {w.count}
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </nav>
      )}

      <form ref={formRef} action={action}>
        {orderedSelected.map((id) => (
          <input key={id} type="hidden" name="shiftId" value={id} />
        ))}

        {bookableIds.size > 1 && (
          <p className="mb-8 flex items-center gap-2.5 text-sm text-foreground/70">
            <span
              aria-hidden
              className="grid size-5 shrink-0 place-items-center rounded border-2 border-leaf-deep bg-card"
            >
              <Check className="size-3 text-leaf-deep" strokeWidth={3} />
            </span>
            Tick several shifts to book them together.
          </p>
        )}

        <div className="space-y-14">
          {weeks.map((w) => (
            <section
              key={w.key}
              id={`week-${w.key}`}
              aria-labelledby={`week-${w.key}-heading`}
              className="scroll-mt-36"
            >
              <div className="mb-6 flex items-baseline justify-between gap-4 border-b border-border pb-3">
                <h2
                  id={`week-${w.key}-heading`}
                  className="display text-2xl font-semibold md:text-3xl"
                >
                  {w.label}
                </h2>
                <span className="font-mono text-xs uppercase tracking-widest text-foreground/65">
                  {countOf(w.count, "shift")}
                </span>
              </div>
              <div className="space-y-8">
                {w.days.map(({ key, day, shifts }) => (
                  <div key={key}>
                    <h3 className="mb-3 text-lg font-semibold md:mb-4">{day}</h3>
                    <ul className="grid gap-3 md:grid-cols-2 md:gap-4 lg:grid-cols-3">
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
            </section>
          ))}
        </div>

        {/* Spacer so the sticky bar never covers the last card on mobile. The
            bar grows by a row when the first-time tick box is in it. */}
        {selectedCount > 0 && (
          <div
            aria-hidden
            className={authed && firstTimePrompt ? "h-44" : "h-28"}
          />
        )}

        {state.error && selectedCount === 0 && (
          <p
            role="alert"
            className="mt-6 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
          >
            {state.error}
          </p>
        )}

        {selectedCount > 0 && (
          <SelectionBar
            count={selectedCount}
            pending={pending}
            authed={authed}
            firstTimePrompt={firstTimePrompt}
            selectedIds={orderedSelected}
            onClear={clearSelection}
            error={state.error ?? null}
          />
        )}
      </form>
    </>
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
    ? "border-2 border-leaf motion-safe:-translate-y-1 shadow-[0_4px_0_-1px_var(--ff-green)]"
    : "border border-border hover:border-leaf/40 hover:shadow-md motion-safe:hover:-translate-y-0.5";
  const spots = shift.isFull ? 0 : shift.free;

  return (
    <li className="relative">
      {/* Phones get a compact row (art chip · time · spots · Book) so a
          month of shifts stays a few screens long; md+ gets the photo card. */}
      <Link
        href={`/shifts/${shift.id}`}
        className={cn(
          "group flex h-full overflow-hidden rounded-md bg-card transition-all md:flex-col",
          cardOutline,
        )}
      >
        <div className="relative w-16 shrink-0 overflow-hidden bg-cream-deep md:aspect-[5/3] md:w-full">
          <div
            className={cn(
              "absolute inset-0 motion-safe:transition-transform motion-safe:duration-500",
              selected
                ? "motion-safe:scale-[1.04]"
                : "motion-safe:group-hover:scale-[1.02]",
            )}
          >
            <ShiftArt program={shift.program} />
          </div>

          {/* Selected-state wash over the photo — ties the photo to the card
              chrome so the whole thing reads as "picked". */}
          {selected && (
            <div className="pointer-events-none absolute inset-0 bg-leaf/25 mix-blend-multiply" />
          )}
        </div>

        {/* Body. On phones the right edge is left clear for the tick box. */}
        <div
          className={cn(
            "flex min-w-0 flex-1 flex-col gap-2 py-3 pl-4 md:gap-3 md:p-5",
            shift.bookable ? "pr-14" : "pr-4",
          )}
        >
          <div>
            <p className="truncate font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-leaf-deep">
              {shift.program.title}
            </p>
            <p className="mt-1 text-base font-semibold leading-snug text-foreground md:mt-1.5">
              <span className="md:hidden">{shift.timeLabel}</span>
              <span className="hidden md:inline">{shift.whenLabel}</span>
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
            <p className="line-clamp-1 text-sm italic text-foreground/70 md:line-clamp-none md:text-xs">
              {shift.notes}
            </p>
          )}

          {failureReason && (
            <p className="text-sm font-medium text-destructive">{failureReason}</p>
          )}

          {/* Footer: spots left (a hard tabular anchor on md+) and the status
              pill, with the action opposite. */}
          <div className="mt-auto flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5 md:items-end md:border-t md:border-border/60 md:pt-3">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <p className="flex items-baseline gap-1.5">
                <span
                  className={cn(
                    "font-mono text-sm font-bold tabular-nums md:text-[26px] md:leading-none",
                    shift.isAlmostFull
                      ? "text-tomato-deep"
                      : shift.isFull
                        ? "text-foreground/65"
                        : "text-foreground",
                  )}
                >
                  {spots}
                </span>
                <span className="text-sm text-foreground/70 md:text-[11px] md:font-medium md:uppercase md:tracking-wider md:text-foreground/65">
                  spot{spots === 1 ? "" : "s"} left
                </span>
              </p>
              {shift.isFull ? (
                <StatusPill tone="neutral">Full</StatusPill>
              ) : alreadyBooked ? (
                <StatusPill tone="solid">
                  <Check className="size-3" strokeWidth={3} aria-hidden />
                  You&rsquo;re going
                </StatusPill>
              ) : shift.isAlmostFull ? (
                <StatusPill tone="warning">Almost full</StatusPill>
              ) : null}
            </div>
            {shift.isFull ? (
              <span className="text-sm font-medium text-foreground/70">View →</span>
            ) : alreadyBooked ? (
              <span className="text-sm font-semibold text-leaf-deep">Details →</span>
            ) : (
              <span className="text-sm font-semibold text-leaf-deep motion-safe:transition-transform motion-safe:group-hover:translate-x-0.5">
                Book →
              </span>
            )}
          </div>
        </div>
      </Link>

      {/* Multi-select control. Sibling of the Link (never nested interactive
          elements). A visible tick box with a 44px hit area — beside the
          compact row on phones, a labelled "Select" chip over the photo on
          md+. The label carries the date and time so a screen reader hears
          forty distinct shifts, not forty "Select Kai Sorting"s. */}
      {shift.bookable ? (
        <button
          type="button"
          role="checkbox"
          aria-checked={selected}
          aria-label={`Select ${shift.program.title}, ${shift.whenLabel.replaceAll(" · ", ", ")}`}
          onClick={onToggle}
          className={cn(
            "group/select absolute right-1 top-1/2 z-10 inline-flex min-h-11 min-w-11 -translate-y-1/2 items-center justify-center gap-2 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
            "md:right-2 md:top-2 md:translate-y-0 md:pl-2.5 md:pr-3.5 md:shadow-md",
            selected
              ? "md:bg-leaf-deep md:text-cream"
              : "md:bg-cream/95 md:text-foreground md:hover:bg-cream",
          )}
        >
          <span
            aria-hidden
            className={cn(
              "grid size-6 place-items-center rounded border-2 transition-colors",
              selected
                ? "border-leaf-deep bg-leaf-deep text-cream md:border-cream"
                : // Empty until ticked — a faint tick on hover previews the
                  // action without making every card look already selected.
                  "border-input bg-card text-transparent group-hover/select:border-leaf-deep group-hover/select:text-leaf-deep/40",
            )}
          >
            <Check className="size-4" strokeWidth={3} />
          </span>
          {/* Constant, like any checkbox label — the box shows the state. */}
          <span aria-hidden className="hidden text-sm font-semibold md:inline">
            Select
          </span>
        </button>
      ) : null}
    </li>
  );
}

/**
 * The programme photo, or — for a programme that has none yet — its theme
 * colour with the initial, so a card never shows an empty beige box. The
 * photo is decorative here (the title is right beside it), hence `alt=""`.
 */
function ShiftArt({ program }: { program: ShiftCard["program"] }) {
  const src = programmeImageSrc(program);
  if (src) {
    return (
      <Image
        src={src}
        alt=""
        fill
        unoptimized={Boolean(program.imageKey)}
        sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 64px"
        className="object-cover"
      />
    );
  }
  const theme = programmeTheme(program.theme);
  return (
    <div
      aria-hidden
      className={cn(
        "display flex h-full w-full items-center justify-center text-2xl font-semibold md:text-6xl",
        theme.card,
        theme.art,
      )}
    >
      {program.title.charAt(0)}
    </div>
  );
}

function SelectionBar({
  count,
  pending,
  authed,
  firstTimePrompt,
  selectedIds,
  onClear,
  error,
}: {
  count: number;
  pending: boolean;
  authed: boolean;
  firstTimePrompt: string | null;
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
      <div className="container-x space-y-2.5">
        {authed && firstTimePrompt && (
          <FirstTimeCheckbox label={firstTimePrompt} className="py-2.5" />
        )}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 flex-col">
            <p className="font-semibold text-foreground">
              {countOf(count, "shift")} selected
            </p>
            {error ? (
              <p role="alert" className="text-sm text-destructive">
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
            >
              Clear
            </Button>
            {authed ? (
              <Button
                type="submit"
                disabled={pending}
                className="px-5 text-base font-semibold"
              >
                {pending ? "Booking…" : `Book ${countOf(count, "shift")}`}
              </Button>
            ) : (
              <Button asChild className="px-5 text-base font-semibold">
                <Link href={signInHref}>
                  Sign up &amp; book {countOf(count, "shift")}
                </Link>
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
