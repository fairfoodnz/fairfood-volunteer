"use client";

import { useRef, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { SCOPES, SORTS } from "./query";
import {
  FilterLabel,
  SEARCH_INPUT_CLASS,
  SELECT_CLASS,
  SegmentButton,
  SegmentCount,
  SegmentGroup,
} from "../flagged/segmented";

type Programme = { slug: string; title: string };

type StatusCounts = {
  all: number;
  flagged: number;
  pending: number;
  admins: number;
};

// Booking-relationship segments map onto the `scope` param.
const BOOKING_SEGMENTS = SCOPES.map((s) => ({
  key: s.key,
  // Shorter labels than the query defaults — the group header says "Booking".
  label: s.key === "all" ? "Any" : s.key === "confirmed" ? "Confirmed" : "Upcoming",
}));

// Profile-status segments map onto the `filter` param. These replace the old
// pills *and* the stat cards — each carries a live count for the current
// programme/booking/search audience.
const STATUS_SEGMENTS = [
  { key: "all", label: "Everyone", countKey: "all" },
  // Everyone who disclosed something, reviewed or not. Deliberately not
  // "Needs review" — that's the sidebar's unreviewed queue, a smaller number.
  { key: "flagged", label: "Flagged", countKey: "flagged" },
  { key: "pending", label: "Profile pending", countKey: "pending" },
  { key: "admins", label: "Admins", countKey: "admins" },
] as const;

export function VolunteersFilters({
  programmes,
  counts,
}: {
  programmes: Programme[];
  counts: StatusCounts;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const programme = params.get("programme") ?? "all";
  const scope = params.get("scope") ?? "all";
  const filter = params.get("filter") ?? "all";
  const sort = params.get("sort") ?? "recent";
  const urlQ = params.get("q") ?? "";

  // Search is debounced and uncontrolled (ref + defaultValue) so typing never
  // fights the URL round-trip. We push the trimmed value after a pause, and
  // reset the field directly on "Clear all".
  const searchRef = useRef<HTMLInputElement>(null);

  const anyActive =
    programme !== "all" || scope !== "all" || filter !== "all" || urlQ !== "";

  const commit = (updates: Record<string, string | null>) => {
    const next = new URLSearchParams(params.toString());
    // Any filter change starts the list again from page 1.
    next.delete("page");
    for (const [key, value] of Object.entries(updates)) {
      if (value === null || value === "" || value === "all" || value === "recent")
        next.delete(key);
      else next.set(key, value);
    }
    const qs = next.toString();
    startTransition(() => {
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    });
  };

  // Debounce the search box; flush immediately on submit/blur.
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onSearchChange = (value: string) => {
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(() => commit({ q: value.trim() || null }), 300);
  };
  const flushSearch = () => {
    if (debounce.current) clearTimeout(debounce.current);
    const value = searchRef.current?.value.trim() ?? "";
    if (value !== urlQ) commit({ q: value || null });
  };
  const clearAll = () => {
    if (searchRef.current) searchRef.current.value = "";
    if (debounce.current) clearTimeout(debounce.current);
    commit({ q: null, programme: null, scope: null, filter: null });
  };

  return (
    <section
      aria-label="Filter volunteers"
      className={cn(
        "rounded-xl border border-border bg-card p-4 transition-opacity md:p-5",
        isPending && "opacity-70",
      )}
    >
      <div className="flex flex-col gap-4">
        {/* Search + sort */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex w-full flex-col gap-1.5 sm:max-w-sm">
            <FilterLabel htmlFor="vol-search">Search</FilterLabel>
            <div className="relative">
              <Search
                aria-hidden
                className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-foreground/65"
              />
              <input
                ref={searchRef}
                id="vol-search"
                type="search"
                defaultValue={urlQ}
                onChange={(e) => onSearchChange(e.target.value)}
                onBlur={flushSearch}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    flushSearch();
                  }
                }}
                placeholder="Name or email"
                className={SEARCH_INPUT_CLASS}
              />
            </div>
          </div>
          <div className="flex flex-wrap items-end gap-2 sm:ml-auto">
            <div className="flex flex-col gap-1.5">
              <FilterLabel htmlFor="vol-sort">Sort</FilterLabel>
              <select
                id="vol-sort"
                value={sort}
                onChange={(e) => commit({ sort: e.target.value })}
                className={SELECT_CLASS}
              >
                {SORTS.map((s) => (
                  <option key={s.key} value={s.key}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
            {anyActive && (
              <button
                type="button"
                onClick={clearAll}
                className="inline-flex h-10 shrink-0 items-center gap-1 whitespace-nowrap rounded-lg px-2.5 text-xs font-semibold text-foreground/70 outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/40"
              >
                <X aria-hidden className="size-3.5" />
                Clear all
              </button>
            )}
          </div>
        </div>

        <div className="h-px bg-border" />

        {/* Audience facets */}
        <div className="flex flex-col gap-4 lg:flex-row lg:flex-wrap lg:items-start lg:gap-8">
          <div className="flex flex-col gap-1.5">
            <FilterLabel htmlFor="vol-programme">Programme</FilterLabel>
            <select
              id="vol-programme"
              value={programme}
              onChange={(e) => commit({ programme: e.target.value })}
              className={cn(SELECT_CLASS, "min-w-44")}
            >
              <option value="all">All programmes</option>
              {programmes.map((p) => (
                <option key={p.slug} value={p.slug}>
                  {p.title}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <FilterLabel id="vol-booking-label">Booking</FilterLabel>
            <SegmentGroup labelledBy="vol-booking-label">
              {BOOKING_SEGMENTS.map((seg) => (
                <SegmentButton
                  key={seg.key}
                  active={scope === seg.key}
                  onClick={() => commit({ scope: seg.key })}
                >
                  {seg.label}
                </SegmentButton>
              ))}
            </SegmentGroup>
          </div>

          <div className="flex flex-col gap-1.5">
            <FilterLabel id="vol-status-label">Status</FilterLabel>
            <SegmentGroup labelledBy="vol-status-label">
              {STATUS_SEGMENTS.map((seg) => (
                <SegmentButton
                  key={seg.key}
                  active={filter === seg.key}
                  onClick={() => commit({ filter: seg.key })}
                >
                  {seg.label}
                  <SegmentCount active={filter === seg.key}>
                    {counts[seg.countKey]}
                  </SegmentCount>
                </SegmentButton>
              ))}
            </SegmentGroup>
          </div>
        </div>
      </div>
    </section>
  );
}
