// One source of truth for "how full is this shift". A shift's spots are eaten
// by confirmed bookings AND by admin slot blocks (off-platform group holds).
// Every surface that shows availability — public list, public detail, the
// booking guard, and admin — must subtract both, so it lives here once.

/** Total slots held across a shift's blocks. */
export function sumBlocks(blocks: { slots: number }[]): number {
  return blocks.reduce((n, b) => n + b.slots, 0);
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
