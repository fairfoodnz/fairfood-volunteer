"use client";

import { useTransition } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RANGES, type RangeKey } from "./ranges";

const URL_DEFAULTS: Record<string, string> = {
  range: "upcoming",
  programme: "all",
};

/**
 * Manage shifts filters — same interaction as the Needs review toolbar:
 * every change writes straight to the URL (no Apply button), defaults stay
 * out of the query string, and the range is a pressed-button segment group.
 * Any filter change drops the page number so you never land on an empty
 * page 4 of a narrower result.
 */
export function ShiftsToolbar({
  programmes,
  range,
  programmeId,
  from,
  to,
}: {
  programmes: { id: string; title: string }[];
  range: RangeKey;
  programmeId: string | null;
  from: string | null;
  to: string | null;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const commit = (updates: Record<string, string | null>) => {
    const next = new URLSearchParams(params.toString());
    next.delete("page");
    for (const [key, value] of Object.entries(updates)) {
      if (!value || value === URL_DEFAULTS[key]) next.delete(key);
      else next.set(key, value);
    }
    const qs = next.toString();
    startTransition(() => {
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    });
  };

  const filtersActive =
    !!programmeId || range !== "upcoming" || !!from || !!to;

  return (
    <section
      aria-label="Filter shifts"
      className={cn(
        "flex flex-col gap-4 transition-opacity",
        isPending && "opacity-70",
      )}
    >
      <div
        role="group"
        aria-label="Show"
        className="inline-flex w-fit flex-wrap items-center gap-0.5 rounded-lg border border-border bg-card p-0.5"
      >
        {RANGES.map((r) => {
          const active = range === r.key;
          return (
            <button
              key={r.key}
              type="button"
              aria-pressed={active}
              onClick={() => commit({ range: r.key })}
              className={cn(
                "inline-flex h-11 items-center rounded-md px-3 text-sm font-semibold outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/40 md:h-9 md:text-xs pointer-coarse:h-11",
                active
                  ? "bg-forest text-cream shadow-sm"
                  : "text-foreground/70 hover:bg-cream-deep/60 hover:text-foreground",
              )}
            >
              {r.label}
            </button>
          );
        })}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 md:flex md:flex-wrap md:items-end md:gap-4">
        <div className="flex flex-col gap-1.5 sm:col-span-2 md:col-span-1">
          <label
            htmlFor="shift-programme"
            className="font-mono text-[11px] uppercase tracking-widest text-foreground/70"
          >
            Programme
          </label>
          <Select
            value={programmeId ?? "all"}
            onValueChange={(v) => {
              if (typeof v === "string") commit({ programme: v });
            }}
            items={{
              all: "All programmes",
              ...Object.fromEntries(programmes.map((p) => [p.id, p.title])),
            }}
          >
            <SelectTrigger id="shift-programme" className="w-full md:w-56">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All programmes</SelectItem>
              {programmes.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="shift-from"
            className="font-mono text-[11px] uppercase tracking-widest text-foreground/70"
          >
            From
          </label>
          <DatePicker
            id="shift-from"
            value={from ?? ""}
            onValueChange={(v) => commit({ from: v || null })}
            placeholder="Any date"
            max={to ?? undefined}
            className="w-full md:w-44"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="shift-to"
            className="font-mono text-[11px] uppercase tracking-widest text-foreground/70"
          >
            To
          </label>
          <DatePicker
            id="shift-to"
            value={to ?? ""}
            onValueChange={(v) => commit({ to: v || null })}
            placeholder="Any date"
            min={from ?? undefined}
            className="w-full md:w-44"
          />
        </div>

        {filtersActive && (
          <Link
            href={pathname}
            replace
            scroll={false}
            className="inline-flex min-h-11 items-center text-sm font-medium text-foreground/70 hover:text-foreground md:ml-auto"
          >
            Clear filters
          </Link>
        )}
      </div>
    </section>
  );
}
