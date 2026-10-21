"use client";

import { toast } from "sonner";
import { cancelShift } from "@/app/admin/actions";
import { countOf, plural } from "@/lib/format";
import { ConfirmDialog } from "@/components/patterns/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

export function CancelShiftDialog({
  shiftId,
  bookedCount,
}: {
  shiftId: string;
  /** CONFIRMED bookings — the volunteers who lose their spot. */
  bookedCount: number;
}) {
  const volunteers =
    bookedCount === 1
      ? "booked volunteer"
      : `${bookedCount} booked volunteers`;
  const description =
    bookedCount > 0
      ? `This takes the shift off the public schedule and cancels ${plural(bookedCount, "the booking", `all ${bookedCount} bookings`)}. You can restore the shift later, but restoring doesn't re-book anyone.`
      : "This takes the shift off the public schedule. No one is booked yet, so no volunteers are affected. You can restore it later.";

  return (
    <ConfirmDialog
      trigger={
        <Button
          variant="outline"
          className="border-tomato/40 text-tomato-deep hover:bg-tomato/10 hover:text-tomato-deep"
        >
          Cancel shift
        </Button>
      }
      title="Cancel this shift?"
      description={description}
      confirmLabel="Cancel shift"
      pendingLabel="Cancelling…"
      cancelLabel="Keep shift"
      fields={{ shiftId }}
      action={async (formData) => {
        const res = await cancelShift(formData);
        if (res.error) {
          toast.error(res.error);
          return;
        }
        const cancelled = res.cancelledBookings ?? 0;
        const emailed = res.emailed ?? 0;
        toast.success(
          cancelled === 0
            ? "Shift cancelled."
            : emailed > 0
              ? `Shift cancelled. ${countOf(emailed, "volunteer")} emailed.`
              : `Shift cancelled. ${countOf(cancelled, "booking")} cancelled, no emails sent.`,
        );
        if (emailed > 0 && emailed < cancelled) {
          toast.error(
            `${countOf(cancelled - emailed, "email")} couldn't be sent. Check the volunteers' email logs.`,
          );
        }
      }}
    >
      {bookedCount > 0 ? (
        <Label className="min-h-11 cursor-pointer items-start rounded-md border border-border bg-muted/40 p-3 font-normal leading-snug">
          <Checkbox name="notify" defaultChecked className="mt-0.5" />
          <span className="text-foreground/85">
            Email the {volunteers} to let them know
          </span>
        </Label>
      ) : null}
    </ConfirmDialog>
  );
}
