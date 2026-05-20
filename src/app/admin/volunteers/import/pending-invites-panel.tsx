"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Mail, RotateCw, MailQuestion, MailCheck, Clock3 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { sendInvitesAction } from "./actions";

/**
 * Volunteers who were created by an import but haven't claimed their account
 * yet. Server-rendered list (passed as `rows`), client-driven actions: bulk
 * send, per-row resend, select-all.
 *
 * `inviteState` encodes three things at once:
 *   - "never"   — created but no invite has ever gone out
 *   - "active"  — invite sent, link still valid (≤7d)
 *   - "expired" — invite sent, link past TTL — coordinator must resend
 *
 * Default selection: everyone who isn't currently holding a live invite. That
 * way the obvious "send to everyone who hasn't been sent one" action is a
 * single click.
 */

export type PendingRow = {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  importedAt: string | null;
  inviteState: "never" | "active" | "expired";
  inviteSentAt: string | null;
};

function defaultSelection(rows: PendingRow[]): Set<string> {
  return new Set(rows.filter((r) => r.inviteState !== "active").map((r) => r.id));
}

/** A stable string fingerprint of the rows array — changes whenever the set of
 *  IDs or their invite-states change. Used to reset local UI state on parent
 *  refresh (post-import, post-send) without an effect. */
function rosterKey(rows: PendingRow[]): string {
  return rows.map((r) => `${r.id}:${r.inviteState}`).join("|");
}

export function PendingInvitesPanel({ rows }: { rows: PendingRow[] }) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();
  const [selected, setSelected] = React.useState<Set<string>>(() => defaultSelection(rows));
  // Track per-row "just sent" so the row visually responds even before the
  // router refresh lands. Cleared on next render after refresh.
  const [justSent, setJustSent] = React.useState<Set<string>>(new Set());

  // Reset both pieces of local state when the server-rendered rows change
  // shape (e.g. a fresh import landed, or invites were sent and the next
  // refresh flipped their states). Stashing the previous key in state and
  // detecting drift during render is the React 19-recommended replacement for
  // a "reset on prop change" effect — see
  // https://react.dev/reference/react/useState#storing-information-from-previous-renders.
  // React discards the in-flight render and starts again with the new state.
  const currentKey = rosterKey(rows);
  const [prevKey, setPrevKey] = React.useState(currentKey);
  if (prevKey !== currentKey) {
    setPrevKey(currentKey);
    setSelected(defaultSelection(rows));
    setJustSent(new Set());
  }

  if (rows.length === 0) {
    return (
      <section className="mt-12">
        <SectionHeading />
        <div className="rounded-md border border-dashed border-border bg-card/50 p-10 text-center text-sm text-foreground/65">
          <Mail className="mx-auto mb-2 size-5 text-foreground/40" />
          No imported volunteers waiting on a claim. Drop in a file above to
          get started.
        </div>
      </section>
    );
  }

  const allSelected = selected.size === rows.length;
  const toggleAll = () => {
    setSelected(allSelected ? new Set() : new Set(rows.map((r) => r.id)));
  };

  const toggleOne = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const send = async (ids: string[]) => {
    if (ids.length === 0) return;
    const idSet = new Set(ids);
    setJustSent((prev) => new Set([...prev, ...ids]));
    const result = await sendInvitesAction({ userIds: ids });
    if (!result.ok) {
      toast.error(result.error);
      setJustSent((prev) => {
        const next = new Set(prev);
        for (const i of idSet) next.delete(i);
        return next;
      });
      return;
    }
    toast.success(
      result.sent === 0
        ? "Nothing to send."
        : `Sent ${result.sent} invite${result.sent === 1 ? "" : "s"}.`,
    );
    startTransition(() => router.refresh());
  };

  return (
    <section className="mt-12">
      <SectionHeading />

      {/* Action bar */}
      <div className="flex flex-col gap-3 rounded-md border border-border bg-cream-deep/40 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <label className="flex items-center gap-2.5 text-sm">
          <input
            type="checkbox"
            checked={allSelected}
            onChange={toggleAll}
            className="size-4 rounded border-border accent-leaf-deep"
            aria-label="Select all"
          />
          <span className="font-medium">
            {selected.size === 0
              ? "Pick volunteers to invite"
              : `${selected.size} selected`}
          </span>
        </label>
        <div className="flex items-center gap-2">
          <Button
            variant="default"
            size="lg"
            disabled={selected.size === 0 || pending}
            onClick={() => void send([...selected])}
            className="bg-leaf-deep text-cream hover:bg-leaf-deep/90"
          >
            <Mail className="size-4" />
            {pending ? "Sending…" : `Send ${selected.size} invite${selected.size === 1 ? "" : "s"}`}
          </Button>
        </div>
      </div>

      {/* List */}
      <div className="mt-3 overflow-hidden rounded-md border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-cream-deep text-left text-foreground/65">
            <tr>
              <th className="w-10 px-4 py-3" aria-label="Select" />
              <th className="px-4 py-3 font-mono text-[10px] uppercase tracking-widest">
                Name
              </th>
              <th className="hidden px-4 py-3 font-mono text-[10px] uppercase tracking-widest md:table-cell">
                Email
              </th>
              <th className="px-4 py-3 font-mono text-[10px] uppercase tracking-widest">
                Invite
              </th>
              <th className="hidden px-4 py-3 font-mono text-[10px] uppercase tracking-widest sm:table-cell">
                Imported
              </th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const checked = selected.has(row.id);
              const wasJustSent = justSent.has(row.id);
              return (
                <tr
                  key={row.id}
                  className={cn(
                    "border-t border-border align-top transition-colors",
                    checked && "bg-leaf/[0.04]",
                  )}
                >
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleOne(row.id)}
                      aria-label={`Select ${row.fullName}`}
                      className="size-4 rounded border-border accent-leaf-deep"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/volunteers/${row.id}`}
                      className="font-semibold hover:text-leaf-deep"
                    >
                      {row.fullName}
                    </Link>
                    {row.phone ? (
                      <div className="mt-0.5 text-xs text-foreground/55">
                        {row.phone}
                      </div>
                    ) : null}
                  </td>
                  <td className="hidden px-4 py-3 text-foreground/75 md:table-cell">
                    <span className="break-all">{row.email}</span>
                  </td>
                  <td className="px-4 py-3">
                    <InviteStatePill
                      state={wasJustSent ? "active" : row.inviteState}
                      sentAt={wasJustSent ? "just now" : row.inviteSentAt}
                    />
                  </td>
                  <td className="hidden px-4 py-3 text-foreground/75 sm:table-cell">
                    {row.importedAt ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => void send([row.id])}
                      disabled={pending}
                      className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-2.5 py-1.5 text-xs font-semibold text-foreground/75 hover:border-leaf-deep/40 hover:text-leaf-deep disabled:cursor-not-allowed disabled:opacity-50"
                      aria-label={`${row.inviteState === "never" ? "Send" : "Resend"} invite to ${row.fullName}`}
                    >
                      <RotateCw className={cn("size-3", wasJustSent && "animate-spin")} />
                      {row.inviteState === "never" ? "Send" : "Resend"}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function SectionHeading() {
  return (
    <header className="mb-4">
      <p className="eyebrow">Pending invites</p>
      <h2 className="display mt-1 text-2xl font-bold leading-tight">
        Send the welcome email.
      </h2>
      <p className="mt-2 max-w-2xl text-sm text-foreground/70">
        These are everyone we&rsquo;ve imported who hasn&rsquo;t signed in yet.
        Pick who to email — each gets a one-time link to set their password.
      </p>
    </header>
  );
}

function InviteStatePill({
  state,
  sentAt,
}: {
  state: "never" | "active" | "expired";
  sentAt: string | null;
}) {
  if (state === "never") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-foreground/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-foreground/65">
        <MailQuestion className="size-3" />
        Never sent
      </span>
    );
  }
  if (state === "expired") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-tomato/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-tomato">
        <Clock3 className="size-3" />
        Expired{sentAt ? ` · sent ${sentAt}` : ""}
      </span>
    );
  }
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full bg-leaf/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-leaf-deep"
      title={sentAt ? `Sent ${sentAt}` : undefined}
    >
      <MailCheck className="size-3" />
      Active{sentAt ? ` · ${sentAt}` : ""}
    </span>
  );
}
