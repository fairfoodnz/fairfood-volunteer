"use client";

import { useRef, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { SCOPES, SORTS } from "./query";

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
  { key: "flagged", label: "Needs review", countKey: "flagged" },
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
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative w-full sm:max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-foreground/50" />
            <input
              ref={searchRef}
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
              placeholder="Search by name or email"
              aria-label="Search volunteers"
              className="h-10 w-full rounded-lg border border-border bg-background pl-9 pr-3 text-sm outline-none transition-colors placeholder:text-foreground/45 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
            <FieldLabel htmlFor="vol-sort">Sort</FieldLabel>
            <select
              id="vol-sort"
              value={sort}
              onChange={(e) => commit({ sort: e.target.value })}
              className="h-10 rounded-lg border border-border bg-background px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40"
            >
              {SORTS.map((s) => (
                <option key={s.key} value={s.key}>
                  {s.label}
                </option>
              ))}
            </select>
            {anyActive && (
              <button
                type="button"
                onClick={clearAll}
                className="inline-flex h-10 shrink-0 items-center gap-1 whitespace-nowrap rounded-lg px-2.5 text-xs font-semibold text-foreground/55 hover:text-foreground"
              >
                <X className="size-3.5" />
                Clear all
              </button>
            )}
          </div>
        </div>

        <div className="h-px bg-border" />

        {/* Audience facets */}
        <div className="flex flex-col gap-4 lg:flex-row lg:flex-wrap lg:items-start lg:gap-8">
          <Field label="Programme">
            <select
              value={programme}
              onChange={(e) => commit({ programme: e.target.value })}
              aria-label="Filter by programme"
              className="h-9 min-w-44 rounded-lg border border-border bg-background px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40"
            >
              <option value="all">All programmes</option>
              {programmes.map((p) => (
                <option key={p.slug} value={p.slug}>
                  {p.title}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Booking">
            <Segmented>
              {BOOKING_SEGMENTS.map((seg) => (
                <SegmentButton
                  key={seg.key}
                  active={scope === seg.key}
                  onClick={() => commit({ scope: seg.key })}
                >
                  {seg.label}
                </SegmentButton>
              ))}
            </Segmented>
          </Field>

          <Field label="Status">
            <Segmented>
              {STATUS_SEGMENTS.map((seg) => (
                <SegmentButton
                  key={seg.key}
                  active={filter === seg.key}
                  onClick={() => commit({ filter: seg.key })}
                >
                  {seg.label}
                  <span
                    className={cn(
                      "ml-1.5 tabular-nums",
                      filter === seg.key ? "text-cream/80" : "text-foreground/45",
                    )}
                  >
                    {counts[seg.countKey]}
                  </span>
                </SegmentButton>
              ))}
            </Segmented>
          </Field>
        </div>
      </div>
    </section>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="font-mono text-[10px] uppercase tracking-widest text-foreground/55">
        {label}
      </span>
      {children}
    </div>
  );
}

function FieldLabel({
  htmlFor,
  children,
}: {
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <label
      htmlFor={htmlFor}
      className="font-mono text-[10px] uppercase tracking-widest text-foreground/55"
    >
      {children}
    </label>
  );
}

function Segmented({ children }: { children: React.ReactNode }) {
  return (
    <div className="inline-flex flex-wrap items-center gap-0.5 rounded-lg border border-border bg-background p-0.5">
      {children}
    </div>
  );
}

function SegmentButton({
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
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "inline-flex h-8 items-center rounded-md px-3 text-xs font-semibold transition-colors",
        active
          ? "bg-leaf text-cream shadow-sm"
          : "text-foreground/70 hover:bg-cream-deep/60 hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}
