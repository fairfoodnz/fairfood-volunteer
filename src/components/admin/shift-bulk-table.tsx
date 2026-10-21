"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ProgramVisibility } from "@/generated/prisma";
import { ProgrammeVisibilityBadge } from "@/components/admin/programme-visibility-badge";
import { toast } from "sonner";
import { Trash2, CalendarX2, RotateCcw, X } from "lucide-react";
import {
  bulkCancelShifts,
  bulkDeleteShifts,
  bulkRestoreShifts,
  type BulkShiftResult,
} from "@/app/admin/actions";
import { countOf, plural } from "@/lib/format";
import { ConfirmDialog } from "@/components/patterns/confirm-dialog";
import { EmptyState } from "@/components/patterns/empty-state";
import { StatusPill } from "@/components/patterns/status-pill";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";

export type ShiftRow = {
  id: string;
  when: string;
  programme: string;
  /** Drives the badge that flags a shift nobody can find on the website. */
  programmeVisibility: ProgramVisibility;
  capacity: number;
  /** CONFIRMED + ATTENDED bookings — volunteers actually holding a spot. */
  confirmed: number;
  blockedSlots: number;
  cancelled: boolean;
};

type DialogKey = "cancel" | "restore" | "delete";

export function ShiftBulkTable({ shifts }: { shifts: ShiftRow[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [openDialog, setOpenDialog] = useState<DialogKey | null>(null);
  // Set once an action succeeds; the selection is cleared after the dialog
  // has closed so its copy doesn't flick to "0 shifts" mid-animation.
  const clearOnClose = useRef(false);

  const byId = useMemo(
    () => new Map(shifts.map((s) => [s.id, s])),
    [shifts],
  );
  const allSelected = shifts.length > 0 && selected.size === shifts.length;
  const someSelected = selected.size > 0 && !allSelected;

  // Views of the selection: cancelling skips already-cancelled shifts
  // (bulkCancelShifts filters `cancelled: false`, so those are no-ops and
  // must not inflate the dialog's volunteer count), restoring only touches
  // cancelled ones, and deleting covers every selected shift.
  const stats = useMemo(() => {
    const cancel = { shifts: 0, withVolunteers: 0, volunteers: 0 };
    const del = { volunteers: 0, blockedSlots: 0 };
    let restorable = 0;
    for (const id of selected) {
      const s = byId.get(id);
      if (!s) continue;
      del.volunteers += s.confirmed;
      del.blockedSlots += s.blockedSlots;
      if (s.cancelled) {
        restorable += 1;
      } else {
        cancel.shifts += 1;
        if (s.confirmed > 0) {
          cancel.withVolunteers += 1;
          cancel.volunteers += s.confirmed;
        }
      }
    }
    return { cancel, del, restorable };
  }, [selected, byId]);

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
      prev.size === shifts.length
        ? new Set()
        : new Set(shifts.map((s) => s.id)),
    );
  }

  function clearSelection() {
    setSelected(new Set());
  }

  function onDialogChange(key: DialogKey, open: boolean) {
    setOpenDialog(open ? key : null);
    if (!open && clearOnClose.current) {
      clearOnClose.current = false;
      clearSelection();
    }
  }

  async function run(
    action: (ids: string[]) => Promise<BulkShiftResult>,
    message: (n: number, requested: number) => string,
  ) {
    const ids = [...selected];
    const res = await action(ids);
    if (res.error) {
      toast.error(res.error);
      return;
    }
    toast.success(message(res.count ?? ids.length, ids.length));
    clearOnClose.current = true;
    router.refresh();
  }

  const count = selected.size;
  const { cancel, del, restorable } = stats;

  if (shifts.length === 0) {
    return (
      <EmptyState action={{ href: "/admin/shifts/new", label: "Create a shift →" }}>
        No shifts match this view.
      </EmptyState>
    );
  }

  return (
    <>
      <div className="overflow-hidden rounded-md border border-border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[40rem] text-sm">
            <caption className="sr-only">
              Shifts matching the current filters. Select rows to cancel,
              restore or delete them together.
            </caption>
            <thead className="bg-cream-deep text-left text-foreground/70">
              <tr>
                <th scope="col" className="w-12 px-4 py-3">
                  <Checkbox
                    checked={allSelected}
                    indeterminate={someSelected}
                    onCheckedChange={toggleAll}
                    aria-label={
                      allSelected ? "Deselect all shifts" : "Select all shifts"
                    }
                  />
                </th>
                <th
                  scope="col"
                  className="px-4 py-3 font-mono text-[11px] uppercase tracking-widest"
                >
                  When
                </th>
                <th
                  scope="col"
                  className="px-4 py-3 font-mono text-[11px] uppercase tracking-widest"
                >
                  Programme
                </th>
                <th
                  scope="col"
                  className="px-4 py-3 font-mono text-[11px] uppercase tracking-widest"
                >
                  Booked
                </th>
                <th scope="col" className="px-4 py-3">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {shifts.map((s) => {
                const isSel = selected.has(s.id);
                return (
                  <tr
                    key={s.id}
                    className={
                      "border-t border-border transition-colors " +
                      (isSel ? "bg-leaf/8" : "hover:bg-cream-deep/40")
                    }
                  >
                    <td className="px-4 py-3">
                      <Checkbox
                        checked={isSel}
                        onCheckedChange={() => toggle(s.id)}
                        aria-label={`Select ${s.programme}, ${s.when}`}
                      />
                    </td>
                    <td className="px-4 py-3 font-medium">
                      <span className="whitespace-nowrap">{s.when}</span>
                      {s.cancelled && (
                        <StatusPill tone="danger" className="ml-2">
                          Cancelled
                        </StatusPill>
                      )}
                    </td>
                    <td className="px-4 py-3 text-foreground/85">
                      <span className="inline-flex flex-wrap items-center gap-2">
                        {s.programme}
                        {s.programmeVisibility !== "PUBLIC" && (
                          <ProgrammeVisibilityBadge
                            visibility={s.programmeVisibility}
                          />
                        )}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 tabular-nums">
                      <span className="font-semibold">
                        {s.confirmed + s.blockedSlots}
                      </span>
                      <span className="text-foreground/70"> / {s.capacity}</span>
                      {s.blockedSlots > 0 && (
                        <StatusPill tone="neutral" className="ml-2">
                          incl. {s.blockedSlots} held
                        </StatusPill>
                      )}
                    </td>
                    <td className="px-4 py-1 text-right">
                      <Link
                        href={`/admin/shifts/${s.id}`}
                        aria-label={`Roster for ${s.programme}, ${s.when}`}
                        className="inline-flex min-h-11 items-center whitespace-nowrap font-semibold text-leaf-deep hover:underline"
                      >
                        Roster →
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Floating bulk-action bar — appears once a selection exists. Stacks
          on phones so every button keeps a full-size tap target. */}
      {count > 0 && (
        <div
          role="region"
          aria-label="Bulk shift actions"
          className="fixed inset-x-0 bottom-4 z-40 flex justify-center px-4 sm:bottom-6"
        >
          <div className="flex w-full max-w-2xl flex-col gap-2 rounded-md border border-border bg-card p-3 shadow-lg ring-1 ring-foreground/5 sm:flex-row sm:items-center sm:gap-3 sm:pl-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold tabular-nums" aria-live="polite">
                {countOf(count, "shift")} selected
              </p>
              <button
                type="button"
                onClick={clearSelection}
                className="inline-flex min-h-11 items-center gap-1 rounded px-2 text-sm text-foreground/70 hover:text-foreground"
              >
                <X className="size-4" aria-hidden />
                Clear
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:ml-auto sm:flex sm:items-center">
              {cancel.shifts > 0 && (
                <Button
                  variant="outline"
                  onClick={() => setOpenDialog("cancel")}
                  className="border-tomato/40 text-tomato-deep hover:bg-tomato/10 hover:text-tomato-deep"
                >
                  <CalendarX2 />
                  Cancel {plural(cancel.shifts, "shift")}
                </Button>
              )}
              {restorable > 0 && (
                <Button
                  variant="outline"
                  onClick={() => setOpenDialog("restore")}
                >
                  <RotateCcw />
                  Restore {plural(restorable, "shift")}
                </Button>
              )}
              <Button
                variant="destructive"
                onClick={() => setOpenDialog("delete")}
              >
                <Trash2 />
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Soft cancel — no emails, restorable later. */}
      <ConfirmDialog
        open={openDialog === "cancel"}
        onOpenChange={(o) => onDialogChange("cancel", o)}
        title={`Cancel ${countOf(cancel.shifts, "shift")}?`}
        description={
          cancel.withVolunteers > 0
            ? `${cancel.withVolunteers} of these ${plural(cancel.withVolunteers, "has", "have")} volunteers booked (${cancel.volunteers} in total). Their ${plural(cancel.volunteers, "booking is", "bookings are")} cancelled and no emails are sent, so let them know yourself. Cancelled shifts drop off the public schedule. You can restore them later, but restoring doesn't re-book anyone.`
            : "These drop off the public schedule. No one is booked, so no volunteers are affected. You can restore them later."
        }
        confirmLabel={`Cancel ${countOf(cancel.shifts, "shift")}`}
        pendingLabel="Cancelling…"
        cancelLabel={`Keep ${plural(cancel.shifts, "shift")}`}
        action={() =>
          run(bulkCancelShifts, (n, requested) =>
            `Cancelled ${countOf(n, "shift")}.` +
            (n < requested
              ? ` ${requested - n} ${plural(requested - n, "was", "were")} already off the schedule.`
              : ""),
          )
        }
      />

      {/* Restore — back on the schedule, bookings stay cancelled. */}
      <ConfirmDialog
        tone="default"
        open={openDialog === "restore"}
        onOpenChange={(o) => onDialogChange("restore", o)}
        title={`Restore ${countOf(restorable, "shift")}?`}
        description="They go back on the schedule and volunteers can book them again. Bookings that were cancelled with them stay cancelled — nobody is re-booked or emailed. Use Assign volunteer on each roster to add people back."
        confirmLabel={`Restore ${countOf(restorable, "shift")}`}
        pendingLabel="Restoring…"
        cancelLabel="Not now"
        action={() =>
          run(bulkRestoreShifts, (n) => `Restored ${countOf(n, "shift")}.`)
        }
      />

      {/* Permanent delete — irreversible, typed confirmation required. The
          input's pattern blocks the form from submitting until it matches. */}
      <ConfirmDialog
        open={openDialog === "delete"}
        onOpenChange={(o) => onDialogChange("delete", o)}
        title={`Permanently delete ${countOf(count, "shift")}?`}
        description={
          <>
            This erases the {plural(count, "shift")} for good
            {del.volunteers > 0 || del.blockedSlots > 0 ? (
              <>
                {" "}
                along with{" "}
                {del.volunteers > 0 && (
                  <strong className="font-semibold text-foreground">
                    {countOf(del.volunteers, "booking")}
                  </strong>
                )}
                {del.volunteers > 0 && del.blockedSlots > 0 && " and "}
                {del.blockedSlots > 0 && (
                  <strong className="font-semibold text-foreground">
                    {countOf(del.blockedSlots, "blocked slot")}
                  </strong>
                )}
              </>
            ) : null}
            . This{" "}
            <strong className="font-semibold text-foreground">
              cannot be undone
            </strong>
            . To just take {plural(count, "it", "them")} off the schedule,
            cancel instead.
          </>
        }
        confirmLabel={`Delete ${countOf(count, "shift")}`}
        pendingLabel="Deleting…"
        cancelLabel={`Keep ${plural(count, "shift")}`}
        action={() =>
          run(bulkDeleteShifts, (n) => `Deleted ${countOf(n, "shift")}.`)
        }
      >
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="bulk-delete-confirm"
            className="text-sm font-medium text-foreground/85"
          >
            Type <span className="font-mono font-semibold">DELETE</span> to
            confirm
          </label>
          <Input
            id="bulk-delete-confirm"
            name="confirm"
            autoComplete="off"
            required
            pattern="DELETE"
            title="Type DELETE in capital letters"
            placeholder="DELETE"
          />
        </div>
      </ConfirmDialog>
    </>
  );
}
