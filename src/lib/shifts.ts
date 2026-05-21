// One source of truth for "how full is this shift". A shift's spots are eaten
// by confirmed bookings AND by admin slot blocks (off-platform group holds).
// Every surface that shows availability — public list, public detail, the
// booking guard, and admin — must subtract both, so it lives here once.

import { SlotBlockKind } from "@/generated/prisma";

/** Total slots held across a shift's blocks. */
export function sumBlocks(blocks: { slots: number }[]): number {
  return blocks.reduce((n, b) => n + b.slots, 0);
}

// Public-facing names. Kept generic on purpose — the volunteer pill doesn't
// expose the admin note (which may name the company, head count etc.) since
// that's coordinator-only context.
const KIND_LABEL: Record<SlotBlockKind, string> = {
  CORPORATE: "Corporate group",
  SCHOOL: "School group",
  COMMUNITY: "Community group",
  OTHER: "Group",
};

export function blockKindLabel(kind: SlotBlockKind): string {
  return KIND_LABEL[kind];
}

// Admin-facing "what is this hold for" options, ordered most → least common
// so the form select shows the typical case first.
export const SLOT_BLOCK_KIND_OPTIONS: { value: SlotBlockKind; label: string }[] = [
  { value: "CORPORATE", label: "Corporate group" },
  { value: "SCHOOL", label: "School group" },
  { value: "COMMUNITY", label: "Community group" },
  { value: "OTHER", label: "Other / unspecified" },
];

export type BlockSummary = { kind: SlotBlockKind; slots: number };

// Collapse a shift's blocks down to one entry per kind for the public pill.
// Coordinators occasionally add multiple holds for the same group ("Acme +2
// extras") and we don't want to render two near-identical pills back-to-back.
// Ordering: largest first, then by enum order — so a 10-person corporate
// group outranks a 1-person OTHER hold on the same shift.
export function summarizeBlocks(
  blocks: { kind: SlotBlockKind; slots: number }[],
): BlockSummary[] {
  const byKind = new Map<SlotBlockKind, number>();
  for (const b of blocks) {
    byKind.set(b.kind, (byKind.get(b.kind) ?? 0) + b.slots);
  }
  const order: Record<SlotBlockKind, number> = {
    CORPORATE: 0,
    SCHOOL: 1,
    COMMUNITY: 2,
    OTHER: 3,
  };
  return Array.from(byKind, ([kind, slots]) => ({ kind, slots })).sort(
    (a, b) => b.slots - a.slots || order[a.kind] - order[b.kind],
  );
}

/**
 * Effective availability for a shift.
 * `confirmed` = CONFIRMED + ATTENDED bookings; `blocked` = sumBlocks(...).
 * `free` is clamped at 0 even if a coordinator deliberately over-holds.
 */
export function shiftAvailability(
  capacity: number,
  confirmed: number,
  blocked: number,
) {
  const taken = confirmed + blocked;
  const free = Math.max(0, capacity - taken);
  return { taken, free, blocked, isFull: free === 0 };
}
