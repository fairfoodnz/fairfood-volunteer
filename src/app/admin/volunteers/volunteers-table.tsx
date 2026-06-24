"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  ArrowUpRight,
  Copy,
  Download,
  ShieldAlert,
  Users,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import { buttonVariants } from "@/components/ui/button";

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

function plural(n: number, one: string, many = `${one}s`) {
  return n === 1 ? one : many;
}

async function copyEmails(emails: string[]) {
  if (emails.length === 0) return;
  const text = emails.join(", ");
  try {
    await navigator.clipboard.writeText(text);
    toast.success(
      `Copied ${emails.length} ${plural(emails.length, "email")} to your clipboard.`,
    );
  } catch {
    toast.error("Couldn't access the clipboard. Try the CSV export instead.");
  }
}

export function VolunteersTable({
  rows,
  capped,
  facets,
  exportAllHref,
}: {
  rows: VolunteerRow[];
  capped: boolean;
  facets: string[];
  exportAllHref: string;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const total = rows.length;
  const allEmails = useMemo(() => rows.map((r) => r.email), [rows]);
  // Derive the selection from currently-visible rows so a selection made under
  // one filter doesn't show as a ghost count after the filters change.
  const selectedRows = useMemo(
    () => rows.filter((r) => selected.has(r.id)),
    [rows, selected],
  );
  const count = selectedRows.length;
  const allSelected = total > 0 && count === total;

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }
  function toggleAll() {
    setSelected((prev) =>
      prev.size === total ? new Set() : new Set(rows.map((r) => r.id)),
    );
  }

  return (
    <>
      {/* Result bar — the audience, with the export bonded directly to it. */}
      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
          <span className="flex items-baseline gap-1.5">
            <span className="text-lg font-bold tabular-nums">
              {total}
              {capped ? "+" : ""}
            </span>
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
            <span className="text-sm text-foreground/55">across all programmes</span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => copyEmails(allEmails)}
            disabled={total === 0}
            className={cn(buttonVariants({ variant: "outline", size: "lg" }))}
          >
            <Copy className="size-4" />
            Copy emails
          </button>
          <a
            href={total === 0 ? undefined : exportAllHref}
            aria-disabled={total === 0}
            className={cn(
              buttonVariants({ size: "lg" }),
              "bg-leaf text-cream hover:bg-leaf-deep",
              total === 0 && "pointer-events-none opacity-50",
            )}
          >
            <Download className="size-4" />
            Export CSV
          </a>
        </div>
      </div>

      <div className="mt-4 overflow-hidden rounded-xl border border-border bg-card">
        {total === 0 ? (
          <div className="flex flex-col items-center gap-2 px-6 py-16 text-center">
            <span
              aria-hidden
              className="flex size-11 items-center justify-center rounded-full bg-foreground/5 text-foreground/45"
            >
              <Users className="size-5" />
            </span>
            <p className="text-sm font-semibold text-foreground/80">
              No volunteers match these filters
            </p>
            <p className="max-w-sm text-sm text-foreground/55">
              Try widening the booking status, switching programme, or clearing
              the search.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-cream-deep text-left text-foreground/65">
                <tr>
                  <th className="w-10 px-4 py-3">
                    <Checkbox
                      checked={allSelected}
                      onCheckedChange={toggleAll}
                      aria-label={
                        allSelected ? "Deselect all" : "Select all volunteers"
                      }
                    />
                  </th>
                  <Th>Name</Th>
                  <Th className="hidden md:table-cell">Contact</Th>
                  <Th className="hidden lg:table-cell">Programmes</Th>
                  <Th>Bookings</Th>
                  <Th className="hidden sm:table-cell">Last active</Th>
                  <th className="px-4 py-3" />
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
                            {u.isAdmin && <Pill tone="leaf">Admin</Pill>}
                            {!u.profileComplete && (
                              <Pill tone="muted">Profile pending</Pill>
                            )}
                            {u.flagged && (
                              <Pill tone="tomato">
                                <ShieldAlert className="size-3" />
                                Needs review
                              </Pill>
                            )}
                          </span>
                          {/* Contact collapses into the name cell on mobile */}
                          <span className="text-xs text-foreground/55 md:hidden">
                            {u.email}
                          </span>
                        </div>
                      </td>
                      <td className="hidden px-4 py-3 align-top text-foreground/75 md:table-cell">
                        <div className="truncate">{u.email}</div>
                        {u.phone && (
                          <div className="text-xs text-foreground/55">
                            {u.phone}
                          </div>
                        )}
                      </td>
                      <td className="hidden px-4 py-3 align-top lg:table-cell">
                        <ProgrammeTags programmes={u.programmes} />
                      </td>
                      <td className="px-4 py-3 align-top tabular-nums">
                        <span className="font-semibold">{u.confirmedCount}</span>
                        <span className="ml-1 text-xs text-foreground/55">
                          confirmed
                        </span>
                      </td>
                      <td className="hidden px-4 py-3 align-top text-foreground/75 sm:table-cell">
                        {u.lastActive ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-right align-top">
                        <Link
                          href={`/admin/volunteers/${u.id}`}
                          className="inline-flex items-center gap-0.5 font-semibold text-leaf-deep hover:underline"
                          aria-label={`Open ${u.name}`}
                        >
                          Open
                          <ArrowUpRight className="size-3.5" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {capped && total > 0 && (
        <p className="mt-3 text-xs text-foreground/55">
          Showing the first {total}. Narrow the filters to see everyone — the CSV
          export still includes the full matching list.
        </p>
      )}

      {/* Floating bar for a hand-picked selection. */}
      {count > 0 && (
        <div
          role="region"
          aria-label="Selected volunteers"
          className="fixed inset-x-0 bottom-6 z-40 flex justify-center px-4"
        >
          <div className="flex w-full max-w-2xl items-center gap-3 rounded-xl border border-border bg-card p-3 pl-4 shadow-lg ring-1 ring-foreground/5">
            <p className="text-sm font-semibold tabular-nums">
              {count} selected
            </p>
            <button
              type="button"
              onClick={() => setSelected(new Set())}
              className="inline-flex items-center gap-1 text-xs text-foreground/55 hover:text-foreground"
            >
              <X className="size-3.5" />
              Clear
            </button>
            <div className="ml-auto flex items-center gap-2">
              <button
                type="button"
                onClick={() => copyEmails(selectedRows.map((r) => r.email))}
                className={cn(buttonVariants({ variant: "outline", size: "lg" }))}
              >
                <Copy className="size-4" />
                Copy {plural(count, "email")}
              </button>
              {/* POST so a large selection's IDs ride in the body, not a URL
                  that could blow past proxy length limits. */}
              <form method="POST" action="/admin/volunteers/export">
                <input
                  type="hidden"
                  name="ids"
                  value={selectedRows.map((r) => r.id).join(",")}
                />
                <button
                  type="submit"
                  className={cn(
                    buttonVariants({ size: "lg" }),
                    "bg-leaf text-cream hover:bg-leaf-deep",
                  )}
                >
                  <Download className="size-4" />
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
    return <span className="text-xs text-foreground/40">—</span>;
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
        <span className="text-[11px] font-medium text-foreground/45">
          +{extra}
        </span>
      )}
    </span>
  );
}

function Pill({
  tone,
  children,
}: {
  tone: "leaf" | "tomato" | "muted";
  children: React.ReactNode;
}) {
  const palette = {
    leaf: "bg-leaf/15 text-leaf-deep",
    tomato: "bg-tomato/15 text-tomato",
    muted: "bg-foreground/10 text-foreground/65",
  }[tone];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest",
        palette,
      )}
    >
      {children}
    </span>
  );
}
