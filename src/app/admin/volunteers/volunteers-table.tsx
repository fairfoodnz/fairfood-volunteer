"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowUpRight, Copy, Download, Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { countOf, plural } from "@/lib/format";
import { Checkbox } from "@/components/ui/checkbox";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/patterns/empty-state";
import { StatusPill } from "@/components/patterns/status-pill";
import type { VolunteerQueryParams } from "./query";
import { matchingEmailsAction } from "./actions";

export type VolunteerRow = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  isAdmin: boolean;
  profileComplete: boolean;
  flagged: boolean;
  confirmedCount: number;
  lastActive: string | null;
  joined: string;
  programmes: { slug: string; title: string }[];
};

async function copyEmails(emails: string[]) {
  if (emails.length === 0) return;
  const text = emails.join(", ");
  try {
    await navigator.clipboard.writeText(text);
    toast.success(`Copied ${countOf(emails.length, "email")} to your clipboard.`);
  } catch {
    toast.error("Couldn't access the clipboard. Try the CSV export instead.");
  }
}

export function VolunteersTable({
  rows,
  total,
  rangeLabel,
  facets,
  audience,
  exportAllHref,
}: {
  /** The current page of results. */
  rows: VolunteerRow[];
  /** Everyone matching the filters, across every page. */
  total: number;
  rangeLabel: string | null;
  facets: string[];
  audience: VolunteerQueryParams;
  exportAllHref: string;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [copying, startCopy] = useTransition();

  const pageSize = rows.length;
  // "Copy emails" covers the whole audience, like Export CSV — not just the
  // page on screen.
  const copyAll = () =>
    startCopy(async () => {
      try {
        await copyEmails(await matchingEmailsAction(audience));
      } catch {
        toast.error("Couldn't fetch those emails. Try again.");
      }
    });
  // Derive the selection from currently-visible rows so a selection made under
  // one filter doesn't show as a ghost count after the filters change.
  const selectedRows = useMemo(
    () => rows.filter((r) => selected.has(r.id)),
    [rows, selected],
  );
  const count = selectedRows.length;
  const allSelected = pageSize > 0 && count === pageSize;

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }
  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(rows.map((r) => r.id)));
  }

  return (
    <>
      {/* Result bar — the audience, with the export bonded directly to it. */}
      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
          <span className="flex items-baseline gap-1.5">
            <span className="text-lg font-bold tabular-nums">{total}</span>
            <span className="text-sm font-medium text-foreground/70">
              {plural(total, "volunteer")}
            </span>
          </span>
          {facets.length > 0 ? (
            <span className="flex flex-wrap items-center gap-1.5">
              {facets.map((f) => (
                <span
                  key={f}
                  className="rounded-full bg-leaf/12 px-2.5 py-0.5 text-xs font-medium text-leaf-deep"
                >
                  {f}
                </span>
              ))}
            </span>
          ) : (
            <span className="text-sm text-foreground/70">across all programmes</span>
          )}
          {rangeLabel && (
            <span
              aria-live="polite"
              className="text-xs tabular-nums text-foreground/70"
            >
              · {rangeLabel}
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={copyAll}
            disabled={total === 0 || copying}
            className={cn(buttonVariants({ variant: "outline", size: "lg" }))}
          >
            {copying ? (
              <Loader2 aria-hidden className="size-4 motion-safe:animate-spin" />
            ) : (
              <Copy aria-hidden className="size-4" />
            )}
            {copying ? "Copying…" : `Copy ${plural(total, "email")}`}
          </button>
          <a
            href={total === 0 ? undefined : exportAllHref}
            aria-disabled={total === 0}
            className={cn(
              buttonVariants({ size: "lg" }),
              "bg-leaf-deep text-cream hover:bg-leaf-ink",
              total === 0 && "pointer-events-none opacity-50",
            )}
          >
            <Download aria-hidden className="size-4" />
            Export CSV
          </a>
        </div>
      </div>

      {rows.length === 0 ? (
        <EmptyState
          className="mt-4"
          action={{ href: "/admin/volunteers", label: "Clear all filters →" }}
        >
          No volunteers match these filters. Try widening the booking status,
          switching programme, or clearing the search.
        </EmptyState>
      ) : (
        <div className="mt-4 overflow-hidden rounded-xl border border-border bg-card">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <caption className="sr-only">
                Volunteers matching the current filters
                {rangeLabel ? ` (${rangeLabel.toLowerCase()})` : ""}
              </caption>
              <thead className="bg-cream-deep text-left text-foreground/70">
                <tr>
                  <th className="w-10 px-4 py-3">
                    <Checkbox
                      checked={allSelected}
                      onCheckedChange={toggleAll}
                      aria-label={
                        allSelected
                          ? "Deselect all on this page"
                          : "Select all on this page"
                      }
                    />
                  </th>
                  <Th>Name</Th>
                  <Th className="hidden md:table-cell">Contact</Th>
                  <Th className="hidden lg:table-cell">Programmes</Th>
                  <Th>Bookings</Th>
                  <Th className="hidden sm:table-cell">Last active</Th>
                  <th className="px-4 py-3">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((u) => {
                  const isSel = selected.has(u.id);
                  return (
                    <tr
                      key={u.id}
                      className={cn(
                        "border-t border-border transition-colors",
                        isSel ? "bg-leaf/8" : "hover:bg-cream-deep/40",
                      )}
                    >
                      <td className="px-4 py-3 align-top">
                        <Checkbox
                          checked={isSel}
                          onCheckedChange={() => toggle(u.id)}
                          aria-label={`Select ${u.name}`}
                        />
                      </td>
                      <td className="px-4 py-3 align-top">
                        <div className="flex flex-col gap-1">
                          <span className="font-semibold">{u.name}</span>
                          <span className="flex flex-wrap items-center gap-1">
                            {u.isAdmin && (
                              <StatusPill tone="positive">Admin</StatusPill>
                            )}
                            {!u.profileComplete && (
                              <StatusPill tone="neutral">Profile pending</StatusPill>
                            )}
                            {/* Neutral, never red — see admin-flagged.md. */}
                            {u.flagged && (
                              <StatusPill tone="neutral">Flagged</StatusPill>
                            )}
                          </span>
                          {/* Contact collapses into the name cell on mobile */}
                          <span className="text-xs text-foreground/65 md:hidden">
                            {u.email}
                          </span>
                        </div>
                      </td>
                      <td className="hidden px-4 py-3 align-top text-foreground/75 md:table-cell">
                        <div className="truncate">{u.email}</div>
                        {u.phone && (
                          <div className="text-xs text-foreground/65">
                            {u.phone}
                          </div>
                        )}
                      </td>
                      <td className="hidden px-4 py-3 align-top lg:table-cell">
                        <ProgrammeTags programmes={u.programmes} />
                      </td>
                      <td className="px-4 py-3 align-top tabular-nums">
                        <span className="font-semibold">{u.confirmedCount}</span>
                        <span className="ml-1 text-xs text-foreground/65">
                          confirmed
                        </span>
                      </td>
                      <td className="hidden px-4 py-3 align-top text-foreground/75 sm:table-cell">
                        {u.lastActive ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-right align-top">
                        <Link
                          href={`/admin/volunteers/${u.id}`}
                          className="inline-flex min-h-9 items-center gap-0.5 font-semibold text-leaf-deep hover:underline"
                          aria-label={`Open ${u.name}`}
                        >
                          Open
                          <ArrowUpRight aria-hidden className="size-3.5" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Floating bar for a hand-picked selection. */}
      {count > 0 && (
        <div
          role="region"
          aria-label="Selected volunteers"
          className="fixed inset-x-0 bottom-6 z-40 flex justify-center px-4"
        >
          <div className="flex w-full max-w-2xl flex-col gap-3 rounded-xl border border-border bg-card p-3 shadow-lg ring-1 ring-foreground/5 sm:flex-row sm:items-center sm:pl-4">
            <div className="flex items-center justify-between gap-3 sm:justify-start">
              <p className="text-sm font-semibold tabular-nums">
                {count} selected
              </p>
              <button
                type="button"
                onClick={() => setSelected(new Set())}
                className="inline-flex h-9 items-center gap-1 rounded-md px-2 text-xs font-semibold text-foreground/70 hover:text-foreground"
              >
                <X aria-hidden className="size-3.5" />
                Clear
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:ml-auto sm:flex sm:items-center">
              <button
                type="button"
                onClick={() => copyEmails(selectedRows.map((r) => r.email))}
                className={cn(buttonVariants({ variant: "outline", size: "lg" }))}
              >
                <Copy aria-hidden className="size-4" />
                Copy {plural(count, "email")}
              </button>
              {/* POST so a large selection's IDs ride in the body, not a URL
                  that could blow past proxy length limits. */}
              <form method="POST" action="/admin/volunteers/export" className="contents sm:block">
                <input
                  type="hidden"
                  name="ids"
                  value={selectedRows.map((r) => r.id).join(",")}
                />
                <button
                  type="submit"
                  className={cn(
                    buttonVariants({ size: "lg" }),
                    "w-full bg-leaf-deep text-cream hover:bg-leaf-ink",
                  )}
                >
                  <Download aria-hidden className="size-4" />
                  Export {count}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function Th({
  children,
  className,
}: {
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <th
      className={cn(
        "px-4 py-3 font-mono text-[10px] uppercase tracking-widest",
        className,
      )}
    >
      {children}
    </th>
  );
}

function ProgrammeTags({
  programmes,
}: {
  programmes: { slug: string; title: string }[];
}) {
  if (programmes.length === 0)
    return <span className="text-xs text-foreground/65">—</span>;
  const shown = programmes.slice(0, 2);
  const extra = programmes.length - shown.length;
  return (
    <span className="flex flex-wrap items-center gap-1">
      {shown.map((p) => (
        <span
          key={p.slug}
          className="rounded-full bg-foreground/5 px-2 py-0.5 text-[11px] font-medium text-foreground/70"
        >
          {p.title}
        </span>
      ))}
      {extra > 0 && (
        <span className="text-[11px] font-medium text-foreground/65">
          +{extra}
        </span>
      )}
    </span>
  );
}
