"use client";

import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/patterns/confirm-dialog";
import { cancelBookingAction } from "../actions";

/**
 * Volunteer-side "cancel my booking", on shift detail and /me. ConfirmDialog
 * keeps "Keep my spot" focused, shows "Cancelling…" while the action runs and
 * can't be double-submitted; the toast confirms once the spot is freed.
 */
export function CancelBookingDialog({
  bookingId,
  triggerLabel = "Cancel shift",
  triggerContext,
}: {
  bookingId: string;
  triggerLabel?: string;
  /** Screen-reader-only context (e.g. "Kai Sorting, Tue 4 Nov") so a list of
   *  Cancel buttons is distinguishable. */
  triggerContext?: string;
}) {
  return (
    <ConfirmDialog
      trigger={
        <Button
          type="button"
          variant="outline"
          className="border-tomato/40 text-tomato-deep hover:bg-tomato/10 hover:text-tomato-deep"
        >
          {triggerLabel}
          {triggerContext ? (
            <span className="sr-only">: {triggerContext}</span>
          ) : null}
        </Button>
      }
      title="Cancel this shift?"
      description="We’ll free your spot for someone else. You can always rebook."
      cancelLabel="Keep my spot"
      confirmLabel="Cancel shift"
      pendingLabel="Cancelling…"
      fields={{ bookingId }}
      action={async (formData) => {
        const { ok } = await cancelBookingAction(formData);
        if (ok) toast.success("Shift cancelled — your spot is free for someone else.");
        else toast.error("We couldn’t cancel that shift. Refresh and try again.");
      }}
    />
  );
}
