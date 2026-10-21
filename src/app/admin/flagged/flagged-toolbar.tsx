"use client";

import { useRef, useTransition } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { TYPES, VIEWS, type ViewKey } from "./query";
import {
  FilterLabel,
  SEARCH_INPUT_CLASS,
  SegmentButton,
  SegmentGroup,
} from "./segmented";

const URL_DEFAULTS: Record<string, string> = { view: "todo", type: "all" };

export function FlaggedToolbar({ counts }: { counts: Record<ViewKey, number> }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const view = params.get("view") ?? "todo";
  const type = params.get("type") ?? "all";
  const urlQ = params.get("q") ?? "";

  // Uncontrolled + debounced, same as the volunteers search: typing never
  // fights the URL round-trip.
  const searchRef = useRef<HTMLInputElement>(null);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hrefWith = (updates: Record<string, string | null>) => {
    const next = new URLSearchParams(params.toString());
    for (const [key, value] of Object.entries(updates)) {
      // Defaults stay out of the URL so the bare path is the canonical view.
      if (!value || value === URL_DEFAULTS[key]) next.delete(key);
      else next.set(key, value);
    }
    const qs = next.toString();
    return qs ? `${pathname}?${qs}` : pathname;
  };
  const commit = (updates: Record<string, string | null>) => {
    startTransition(() => {
      router.replace(hrefWith(updates), { scroll: false });
    });
  };

  const onSearchChange = (value: string) => {
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(() => commit({ q: value.trim() || null }), 300);
  };
  const flushSearch = () => {
    if (debounce.current) clearTimeout(debounce.current);
    const value = searchRef.current?.value.trim() ?? "";
    if (value !== urlQ) commit({ q: value || null });
  };
  const clearSearch = () => {
    if (debounce.current) clearTimeout(debounce.current);
    if (searchRef.current) searchRef.current.value = "";
    commit({ q: null });
    searchRef.current?.focus();
  };

  return (
    <section
      aria-label="Filter flagged volunteers"
      className={cn("transition-opacity", isPending && "opacity-70")}
    >
      {/* Views are real links (deep-linkable, carry the other filters along),
          not ARIA tabs — there's no tabpanel behind them. */}
      <nav
        aria-label="Review status"
        className="flex border-b border-border sm:gap-1"
      >
        {VIEWS.map((v) => {
          const active = view === v.key;
          return (
            <Link
              key={v.key}
              href={hrefWith({ view: v.key })}
              replace
              scroll={false}
              aria-current={active ? "page" : undefined}
              className={cn(
                "-mb-px inline-flex h-11 shrink-0 items-center gap-1.5 whitespace-nowrap border-b-2 px-2.5 text-sm font-semibold outline-none transition-colors focus-visible:bg-cream-deep/60 sm:px-4",
                active
                  ? "border-leaf text-foreground"
                  : "border-transparent text-foreground/70 hover:text-foreground",
              )}
            >
              {v.label}
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums",
                  active
                    ? "bg-leaf-deep text-cream"
                    : "bg-foreground/10 text-foreground/65",
                )}
              >
                {counts[v.key]}
              </span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-1.5">
          <FilterLabel id="flagged-type-label">Disclosure type</FilterLabel>
          <SegmentGroup labelledBy="flagged-type-label">
            {TYPES.map((t) => (
              <SegmentButton
                key={t.key}
                active={type === t.key}
                onClick={() => commit({ type: t.key })}
              >
                {t.label}
              </SegmentButton>
            ))}
          </SegmentGroup>
        </div>

        <div className="flex w-full flex-col gap-1.5 sm:max-w-xs">
          <FilterLabel htmlFor="flagged-search">Search</FilterLabel>
          <div className="relative">
            <Search
              aria-hidden
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-foreground/65"
            />
            <input
              ref={searchRef}
              id="flagged-search"
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
            {urlQ && (
              <button
                type="button"
                onClick={clearSearch}
                aria-label="Clear search"
                className="absolute right-1 top-1/2 inline-flex size-8 -translate-y-1/2 items-center justify-center rounded-md text-foreground/65 outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/40"
              >
                <X className="size-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
