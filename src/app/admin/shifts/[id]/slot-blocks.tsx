"use client";

import { useActionState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  /** Open spots before this form — pre-fills the input as a sensible default. */
  remaining: number;
}) {
  const [state, action, pending] = useActionState<SlotBlockState, FormData>(
    addSlotBlock,
    {},
  );
  const formRef = useRef<HTMLFormElement>(null);

  // Clear the inputs once a block lands so the next entry starts fresh.
  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state]);

  const total = blocks.reduce((n, b) => n + b.slots, 0);

  return (
    <div className="space-y-4">
      {blocks.length === 0 ? (
        <div className="rounded-md border border-dashed border-border bg-card p-5 text-sm text-foreground/65">
          No slots blocked. Use this to hold spots for a group booked off
          platform. Held slots come out of public capacity, and volunteers see
          a discreet &ldquo;Corporate group joining&rdquo; / &ldquo;School
          group joining&rdquo; pill on the shift (the internal note stays
          admin-only).
        </div>
      ) : (
        <ul className="divide-y divide-border rounded-md border border-border bg-card">
          {blocks.map((b) => (
            <li
              key={b.id}
              className="grid gap-3 p-4 md:grid-cols-[1fr_auto] md:items-center"
            >
              <div>
                <p className="font-semibold">
                  {b.slots} slot{b.slots === 1 ? "" : "s"} blocked
                  <span className="ml-2 inline-flex items-center rounded-full bg-leaf/10 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-leaf-deep">
                    {blockKindLabel(b.kind)}
                  </span>
                </p>
                {b.note && (
                  <p className="mt-1 text-sm text-foreground/75">{b.note}</p>
                )}
                <p className="mt-1 font-mono text-[10px] uppercase tracking-widest text-foreground/55">
                  added {dateFmt.format(b.createdAt)} · shown to volunteers as
                  {` “${blockKindLabel(b.kind)} joining”`}
                </p>
              </div>
              <form action={removeSlotBlock}>
                <input type="hidden" name="blockId" value={b.id} />
                <Button
                  type="submit"
                  variant="ghost"
                  size="sm"
                  className="text-xs text-tomato hover:bg-tomato/10 hover:text-tomato"
                >
                  Remove
                </Button>
              </form>
            </li>
          ))}
        </ul>
      )}

      <form
        ref={formRef}
        action={action}
        className="rounded-md border border-border bg-card p-4 md:p-5"
      >
        <input type="hidden" name="shiftId" value={shiftId} />
        <div className="grid gap-4 sm:grid-cols-[6rem_minmax(0,12rem)_1fr] sm:items-end">
          <div className="space-y-1.5">
            <Label htmlFor="slots">Slots</Label>
            <Input
              id="slots"
              name="slots"
              type="number"
              min={1}
              defaultValue={Math.max(1, remaining)}
              required
              className="h-11"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="kind">Group type</Label>
            <select
              id="kind"
              name="kind"
              defaultValue={SlotBlockKind.CORPORATE}
              className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-leaf focus-visible:ring-offset-1"
            >
              {SLOT_BLOCK_KIND_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="note">
              Internal note{" "}
              <span className="text-foreground/50">(optional, admin-only)</span>
            </Label>
            <Input
              id="note"
              name="note"
              type="text"
              maxLength={500}
              placeholder="e.g. Acme Co. team day — 8 confirmed by email"
              className="h-11"
            />
          </div>
        </div>

        {state.error && (
          <p
            role="alert"
            aria-live="polite"
            className="mt-3 text-sm text-destructive"
          >
            {state.error}
          </p>
        )}

        <div className="mt-4 flex items-center justify-between gap-3">
          <p className="text-xs text-foreground/55">
            {total > 0
              ? `${total} slot${total === 1 ? "" : "s"} blocked so far.`
              : "Volunteers see the group type, not the internal note."}
          </p>
          <Button
            type="submit"
            disabled={pending}
            className="bg-leaf hover:bg-leaf-deep"
          >
            {pending ? "Blocking…" : "Block slots"}
          </Button>
        </div>
      </form>
    </div>
  );
}
