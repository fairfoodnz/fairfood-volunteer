"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AlertTriangle, Trash2, CalendarX2, X } from "lucide-react";
import {
  bulkCancelShifts,
  bulkDeleteShifts,
  type BulkShiftResult,
} from "@/app/admin/actions";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export type ShiftRow = {
  id: string;
  when: string;
  programme: string;
  capacity: number;
  /** CONFIRMED + ATTENDED bookings — volunteers actually holding a spot. */
  confirmed: number;
  blockedSlots: number;
  cancelled: boolean;
};

function plural(n: number, one: string, many = `${one}s`) {
  return n === 1 ? one : many;
}

export function ShiftBulkTable({ shifts }: { shifts: ShiftRow[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [cancelOpen, setCancelOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [pending, startTransition] = useTransition();

  const byId = useMemo(
    () => new Map(shifts.map((s) => [s.id, s])),
    [shifts],
  );
  const allSelected = shifts.length > 0 && selected.size === shifts.length;

  // Two views of the selection: `cancelStats` excludes already-cancelled
  // shifts (bulkCancelShifts filters `cancelled: false`, so those are no-ops
  // and must not inflate the dialog's volunteer count); `deleteStats` covers
  // every selected shift since deleteMany has no such guard.
  const { cancelStats, deleteStats } = useMemo(() => {
    const cancel = { withVolunteers: 0, volunteers: 0 };
    const del = { volunteers: 0, blockedSlots: 0 };
    for (const id of selected) {
      const s = byId.get(id);
      if (!s) continue;
      del.volunteers += s.confirmed;
      del.blockedSlots += s.blockedSlots;
      if (!s.cancelled && s.confirmed > 0) {
        cancel.withVolunteers += 1;
        cancel.volunteers += s.confirmed;
      }
    }
    return { cancelStats: cancel, deleteStats: del };
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

  function run(
    action: (ids: string[]) => Promise<BulkShiftResult>,
    verb: string,
    onDone: () => void,
  ) {
    const ids = [...selected];
    startTransition(async () => {
      const res = await action(ids);
      if (res.error) {
        toast.error(res.error);
        return;
      }
      const n = res.count ?? ids.length;
      toast.success(
        `${verb} ${n} ${plural(n, "shift")}.` +
          (n < ids.length
            ? ` ${ids.length - n} ${plural(ids.length - n, "was", "were")} already off the schedule.`
            : ""),
      );
      onDone();
      clearSelection();
      router.refresh();
    });
  }

  const count = selected.size;

  return (
    <>
      <div className="overflow-hidden rounded-md border border-border bg-card">
        {shifts.length === 0 ? (
          <div className="p-12 text-center text-sm text-foreground/65">
            No shifts match this view.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-cream-deep text-left text-foreground/65">
              <tr>
                <th className="w-10 px-4 py-3">
                  <Checkbox
                    checked={allSelected}
                    onCheckedChange={toggleAll}
                    aria-label={
                      allSelected ? "Deselect all shifts" : "Select all shifts"
                    }
                  />
                </th>
                <th className="px-4 py-3 font-mono text-[10px] uppercase tracking-widest">
                  When
                </th>
                <th className="px-4 py-3 font-mono text-[10px] uppercase tracking-widest">
                  Programme
                </th>
                <th className="px-4 py-3 font-mono text-[10px] uppercase tracking-widest">
                  Booked
                </th>
                <th className="px-4 py-3 font-mono text-[10px] uppercase tracking-widest" />
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
                        aria-label={`Select ${s.programme} — ${s.when}`}
                      />
                    </td>
                    <td className="px-4 py-3 font-medium">
                      {s.when}
                      {s.cancelled && (
                        <span className="ml-2 rounded-full bg-tomato/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-tomato">
                          Cancelled
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-foreground/80">
                      {s.programme}
                    </td>
                    <td className="px-4 py-3 tabular-nums">
                      <span className="font-semibold">{s.confirmed}</span>
                      <span className="text-foreground/55"> / {s.capacity}</span>
                      {s.blockedSlots > 0 && (
                        <span className="ml-2 rounded-full bg-foreground/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-foreground/65">
                          {s.blockedSlots} held
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/admin/shifts/${s.id}`}
                        className="font-semibold text-leaf-deep hover:underline"
                      >
                        Roster →
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Floating bulk-action bar — appears once a selection exists. */}
      {count > 0 && (
        <div
          role="region"
          aria-label="Bulk shift actions"
          className="fixed inset-x-0 bottom-6 z-40 flex justify-center px-4"
        >
          <div className="flex w-full max-w-2xl items-center gap-3 rounded-xl border border-border bg-card p-3 pl-4 shadow-lg ring-1 ring-foreground/5">
            <p className="text-sm font-semibold tabular-nums">
              {count} {plural(count, "shift")} selected
            </p>
            <button
              type="button"
              onClick={clearSelection}
              className="inline-flex items-center gap-1 text-xs text-foreground/55 hover:text-foreground"
            >
              <X className="size-3.5" />
              Clear
            </button>
            <div className="ml-auto flex items-center gap-2">
              <Button
                size="lg"
                variant="outline"
                onClick={() => setCancelOpen(true)}
                disabled={pending}
              >
                <CalendarX2 className="size-4" />
                Cancel {plural(count, "shift")}
              </Button>
              <Button
                size="lg"
                variant="destructive"
                onClick={() => {
                  setConfirmText("");
                  setDeleteOpen(true);
                }}
                disabled={pending}
              >
                <Trash2 className="size-4" />
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Soft cancel — reversible, no emails sent. */}
      <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <DialogContent>
          <DialogHeader>
            <span
              aria-hidden
              className="flex size-10 items-center justify-center rounded-full bg-tomato/12 text-tomato"
            >
              <CalendarX2 className="size-5" />
            </span>
            <DialogTitle>
              Cancel {count} {plural(count, "shift")}?
            </DialogTitle>
            <DialogDescription>
              {cancelStats.withVolunteers > 0 ? (
                <>
                  {cancelStats.withVolunteers} of these have volunteers booked (
                  {cancelStats.volunteers} in total). They keep their booking
                  history but lose their{" "}
                  {plural(cancelStats.volunteers, "spot")} —{" "}
                  <strong className="font-semibold text-foreground">
                    no emails are sent
                  </strong>
                  , so let them know. Cancelled shifts drop off the public
                  schedule and can be brought back later.
                </>
              ) : (
                <>
                  These drop off the public schedule. No one is booked, so no
                  volunteers are affected. This is reversible.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>
              Keep {plural(count, "shift")}
            </DialogClose>
            <Button
              className="bg-tomato text-cream hover:bg-tomato/90"
              disabled={pending}
              onClick={() =>
                run(bulkCancelShifts, "Cancelled", () => setCancelOpen(false))
              }
            >
              {pending ? "Cancelling…" : `Cancel ${count} ${plural(count, "shift")}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Permanent delete — irreversible, typed confirmation required. */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <span
              aria-hidden
              className="flex size-10 items-center justify-center rounded-full bg-destructive/12 text-destructive"
            >
              <AlertTriangle className="size-5" />
            </span>
            <DialogTitle>
              Permanently delete {count} {plural(count, "shift")}?
            </DialogTitle>
            <DialogDescription>
              This erases the {plural(count, "shift")} for good
              {deleteStats.volunteers > 0 || deleteStats.blockedSlots > 0 ? (
                <>
                  {" "}
                  along with{" "}
                  {deleteStats.volunteers > 0 && (
                    <strong className="font-semibold text-foreground">
                      {deleteStats.volunteers}{" "}
                      {plural(deleteStats.volunteers, "booking")}
                    </strong>
                  )}
                  {deleteStats.volunteers > 0 &&
                    deleteStats.blockedSlots > 0 &&
                    " and "}
                  {deleteStats.blockedSlots > 0 && (
                    <strong className="font-semibold text-foreground">
                      {deleteStats.blockedSlots} blocked{" "}
                      {plural(deleteStats.blockedSlots, "slot")}
                    </strong>
                  )}
                </>
              ) : null}
              . This <strong className="font-semibold text-foreground">cannot be undone</strong> — to
              just take {plural(count, "it", "them")} off the schedule, cancel
              instead.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="bulk-delete-confirm"
              className="text-xs font-medium text-foreground/70"
            >
              Type <span className="font-mono font-semibold">DELETE</span> to
              confirm
            </label>
            <Input
              id="bulk-delete-confirm"
              autoComplete="off"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="DELETE"
              className="h-9"
            />
          </div>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>
              Keep {plural(count, "shift")}
            </DialogClose>
            <Button
              variant="destructive"
              className="bg-destructive text-white hover:bg-destructive/90 dark:bg-destructive"
              disabled={pending || confirmText.trim() !== "DELETE"}
              onClick={() =>
                run(bulkDeleteShifts, "Deleted", () => setDeleteOpen(false))
              }
            >
              {pending
                ? "Deleting…"
                : `Delete ${count} ${plural(count, "shift")}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
