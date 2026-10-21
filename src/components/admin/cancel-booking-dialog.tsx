"use client";

import { toast } from "sonner";
import { setBookingStatus } from "@/app/admin/actions";
import { BookingStatus } from "@/generated/prisma";
import { ConfirmDialog } from "@/components/patterns/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

export function CancelBookingDialog({
  bookingId,
  volunteerName,
}: {
  bookingId: string;
  volunteerName: string;
}) {
  return (
    <ConfirmDialog
      trigger={
        <Button
          type="button"
          variant="outline"
          aria-label={`Cancel, ${volunteerName}`}
          className="border-tomato/40 text-tomato-deep hover:bg-tomato/10 hover:text-tomato-deep"
        >
          Cancel
        </Button>
      }
      title="Cancel this booking?"
      description={`${volunteerName} will lose their spot on this shift, which frees it for someone else. You can reinstate the booking later if needed.`}
      confirmLabel="Cancel booking"
      pendingLabel="Cancelling…"
      cancelLabel="Keep booking"
      fields={{ bookingId, status: BookingStatus.CANCELLED }}
      action={async (formData) => {
        await setBookingStatus(formData);
        toast.success(
          formData.get("notify") != null
            ? `Booking cancelled. ${volunteerName} has been emailed.`
            : "Booking cancelled. No email sent.",
        );
      }}
    >
      <Label className="min-h-11 cursor-pointer items-start rounded-md border border-border bg-muted/40 p-3 font-normal leading-snug">
        <Checkbox name="notify" defaultChecked className="mt-0.5" />
        <span className="text-foreground/85">
          Email {volunteerName} to let them know their booking was cancelled
        </span>
      </Label>
    </ConfirmDialog>
  );
}
