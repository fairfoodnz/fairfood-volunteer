"use client";

import { useFormStatus } from "react-dom";
import { AlertTriangle } from "lucide-react";
import { setBookingStatus } from "@/app/admin/actions";
import { BookingStatus } from "@/generated/prisma";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

function ConfirmButton() {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      disabled={pending}
      className="bg-tomato text-cream hover:bg-tomato/90"
    >
      {pending ? "Cancelling…" : "Cancel booking"}
    </Button>
  );
}

export function CancelBookingDialog({
  bookingId,
  volunteerName,
}: {
  bookingId: string;
  volunteerName: string;
}) {
  return (
    <Dialog>
      <DialogTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-xs text-tomato hover:bg-tomato/10 hover:text-tomato"
          />
        }
      >
        Cancel
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <span
            aria-hidden
            className="flex size-10 items-center justify-center rounded-full bg-tomato/12 text-tomato"
          >
            <AlertTriangle className="size-5" />
          </span>
          <DialogTitle>Cancel this booking?</DialogTitle>
          <DialogDescription>
            {volunteerName} will lose their spot on this shift. This frees the
            spot for someone else — you can reinstate the booking later if
            needed.
          </DialogDescription>
        </DialogHeader>
        <form action={setBookingStatus} className="contents">
          <input type="hidden" name="bookingId" value={bookingId} />
          <input type="hidden" name="status" value={BookingStatus.CANCELLED} />
          <Label className="cursor-pointer items-start rounded-lg border border-border bg-muted/40 p-3 font-normal">
            <Checkbox name="notify" defaultChecked className="mt-0.5" />
            <span className="text-foreground/80">
              Email {volunteerName} to let them know their booking was cancelled
            </span>
          </Label>
          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" />}>
              Keep booking
            </DialogClose>
            <ConfirmButton />
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
