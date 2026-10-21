"use client";

import { useActionState, useEffect, useRef } from "react";
import { ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/patterns/confirm-dialog";
import { countOf } from "@/lib/format";
import { StatusPill } from "@/components/patterns/status-pill";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  addSlotBlock,
  removeSlotBlock,
  type SlotBlockState,
} from "../../actions";
import { SlotBlockKind } from "@/generated/prisma";
import { blockKindLabel, SLOT_BLOCK_KIND_OPTIONS } from "@/lib/shifts";

type Block = {
  id: string;
  slots: number;
  kind: SlotBlockKind;
  note: string | null;
  createdAt: Date;
};

const dateFmt = new Intl.DateTimeFormat("en-NZ", {
  day: "numeric",
  month: "short",
  timeZone: "Pacific/Auckland",
});

export function SlotBlocks({
  shiftId,
  blocks,
  remaining,
}: {
  shiftId: string;
  blocks: Block[];
  /** Open spots right now — caps the input so it can't over-hold. */
  remaining: number;
}) {
  const [state, action, pending] = useActionState<SlotBlockState, FormData>(
    addSlotBlock,
    {},
  );
  const formRef = useRef<HTMLFormElement>(null);

  // Clear the inputs once a block lands so the next entry starts fresh.
  useEffect(() => {
    if (state.ok) {
      formRef.current?.reset();
      toast.success("Slots blocked.");
    }
  }, [state]);

  const total = blocks.reduce((n, b) => n + b.slots, 0);

  return (
    <div className="space-y-4">
      {blocks.length === 0 ? null : (
        <ul className="divide-y divide-border rounded-md border border-border bg-card">
          {blocks.map((b) => (
            <li
              key={b.id}
              className="grid gap-3 p-4 md:grid-cols-[1fr_auto] md:items-center"
            >
              <div>
                <p className="font-semibold">
                  {countOf(b.slots, "slot")} blocked
                  <StatusPill tone="positive" className="ml-2">
                    {blockKindLabel(b.kind)}
                  </StatusPill>
                </p>
                {b.note && (
                  <p className="mt-1 text-sm text-foreground/75">{b.note}</p>
                )}
                <p className="mt-1 font-mono text-[10px] uppercase tracking-widest text-foreground/65">
                  added {dateFmt.format(b.createdAt)} · shown to volunteers as
                  {` “${blockKindLabel(b.kind)} joining”`}
                </p>
              </div>
              <ConfirmDialog
                trigger={
                  <Button
                    type="button"
                    variant="outline"
                    aria-label={`Remove ${countOf(b.slots, "blocked slot")} (${blockKindLabel(b.kind)})`}
                    className="border-tomato/40 text-tomato-deep hover:bg-tomato/10 hover:text-tomato-deep"
                  >
                    Remove
                  </Button>
                }
                title="Remove this slot block?"
                description={`The ${countOf(b.slots, "held spot")} go${b.slots === 1 ? "es" : ""} back on sale to volunteers straight away.${b.note ? ` Your note ("${b.note}") is deleted with it.` : ""}`}
                confirmLabel="Remove block"
                pendingLabel="Removing…"
                cancelLabel="Keep block"
                fields={{ blockId: b.id }}
                action={async (formData) => {
                  await removeSlotBlock(formData);
                  toast.success(
                    `${countOf(b.slots, "slot")} released back to the roster.`,
                  );
                }}
              />
            </li>
          ))}
        </ul>
      )}

      {/* Secondary task, so the form starts folded away; it opens itself
          when there's an error to show. */}
      <details
        open={state.error ? true : undefined}
        className="group rounded-md border border-border bg-card"
      >
        <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-semibold outline-none focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden md:px-5">
          Block slots for a group
          <ChevronDown
            aria-hidden
            className="size-4 text-foreground/65 transition-transform group-open:rotate-180"
          />
        </summary>
        <p className="px-4 text-sm text-foreground/70 md:px-5">
          Hold spots for a group booked off the platform. Held slots come out of
          public capacity, and volunteers see a discreet &ldquo;Corporate group
          joining&rdquo; / &ldquo;School group joining&rdquo; pill on the shift.
          The internal note stays admin-only.
        </p>
        <form ref={formRef} action={action} className="p-4 md:p-5">
          <input type="hidden" name="shiftId" value={shiftId} />
          <div className="grid gap-4 sm:grid-cols-[6rem_minmax(0,12rem)_1fr] sm:items-end">
            <div className="space-y-1.5">
              <Label htmlFor="slots">Slots</Label>
              <Input
                id="slots"
                name="slots"
                type="number"
                min={1}
                max={Math.max(1, remaining)}
                defaultValue={1}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="kind">Group type</Label>
              <Select
                name="kind"
                defaultValue={SlotBlockKind.CORPORATE}
                items={Object.fromEntries(
                  SLOT_BLOCK_KIND_OPTIONS.map((o) => [o.value, o.label]),
                )}
              >
                <SelectTrigger id="kind" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SLOT_BLOCK_KIND_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="note">
                Internal note{" "}
                <span className="text-foreground/65">
                  (optional, admin-only)
                </span>
              </Label>
              <Input
                id="note"
                name="note"
                type="text"
                maxLength={500}
                placeholder="e.g. Acme Co. team day — 8 confirmed by email"
              />
            </div>
          </div>

          {state.error && (
            <p role="alert" className="mt-3 text-sm text-destructive">
              {state.error}
            </p>
          )}

          <div className="mt-4 flex items-center justify-between gap-3">
            <p className="text-xs text-foreground/65">
              {total > 0
                ? `${countOf(total, "slot")} blocked so far · ${remaining} open.`
                : "Volunteers see the group type, not the internal note."}
            </p>
            <Button
              type="submit"
              disabled={pending || remaining <= 0}
              className="bg-leaf-deep hover:bg-leaf-ink"
            >
              {pending ? "Blocking…" : "Block slots"}
            </Button>
          </div>
        </form>
      </details>
    </div>
  );
}
